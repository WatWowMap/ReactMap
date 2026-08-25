// server/acceptance/support/harness.ts
//
// The acceptance harness, extracted from transport.acceptance.ts so a second
// suite can drive a real server the same way rather than growing a parallel
// copy of it. Nothing here changed shape in the move: the timeouts, the
// abort/elapsed-time contract, the socket buffering and the Golbat-shaped
// fixtures are the ones the transport criteria were written against.
//
// What the move added is parameterisation. A suite supplies its own port and
// its own user prefix, so two suites can run against two servers at once
// without colliding on either.

const CLIENT_TIMEOUT_MS = 5_000
const HANG_THRESHOLD_MS = 2_000
// How long a suite waits for a poll-driven WebSocket message before calling
// it a hang. Generous relative to HANG_THRESHOLD_MS because the delta engine
// is poll-cycle driven rather than sub-100ms, but still a real ceiling: a
// message that never arrives inside this window fails the test with a "did
// not arrive" error, not a silent skip.
const WS_WAIT_MS = 20_000
// How long a suite watches for a message it expects NOT to see.
const WS_QUIET_WINDOW_MS = 6_000

const WORLD_VIEWPORT = {
  min: { lat: -90, lon: -180 },
  max: { lat: 90, lon: 180 },
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * fetch with an explicit abort timeout and elapsed-time measurement, same
 * contract as auth-flow.acceptance.ts's timedFetch.
 */
async function timedFetch(url: string, options: RequestInit = {}) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), CLIENT_TIMEOUT_MS)
  const start = performance.now()
  try {
    const response = await fetch(url, { ...options, signal: controller.signal })
    const text = await response.text()
    const elapsedMs = performance.now() - start
    let json: any
    try {
      json = text ? JSON.parse(text) : undefined
    } catch {
      json = undefined
    }
    return { response, text, json, elapsedMs }
  } catch (e) {
    const elapsedMs = performance.now() - start
    if (e && typeof e === 'object' && 'name' in e && e.name === 'AbortError') {
      throw new Error(
        `${url} did not complete within ${CLIENT_TIMEOUT_MS}ms (elapsed ${elapsedMs.toFixed(0)}ms). ` +
          'This is a hang, not a slow response.',
      )
    }
    throw e
  } finally {
    clearTimeout(timer)
  }
}

function getSessionCookie(response: Response): string | null {
  const raw = response.headers.get('set-cookie')
  if (!raw) return null
  const [pair] = raw.split(';')
  return pair ?? null
}

async function waitForServerReady(baseUrl: string, maxWaitMs: number) {
  const deadline = Date.now() + maxWaitMs
  let lastError: unknown
  while (Date.now() < deadline) {
    try {
      const { response } = await timedFetch(`${baseUrl}/api/health`)
      if (response.status === 200) return
    } catch (e) {
      lastError = e
    }
    await sleep(300)
  }
  throw new Error(
    `Server did not become ready on ${baseUrl} within ${maxWaitMs}ms. Last error: ${lastError}`,
  )
}

interface AuthHelpersOptions {
  baseUrl: string
  /** Prefixes every generated username and email, so a suite's rows are its own. */
  prefix: string
}

interface AuthHelpers {
  emailFor: (label: string) => string
  usernameFor: (label: string) => string
  signUpAndSignIn: (label: string) => Promise<string | null>
}

/**
 * Builds the sign-up/sign-in helper bound to one base URL and one user
 * prefix. The prefix is also what a suite's afterAll deletes by, so it has to
 * be unique per run.
 */
function createAuthHelpers({
  baseUrl,
  prefix,
}: AuthHelpersOptions): AuthHelpers {
  const emailFor = (label: string) =>
    `${prefix}-${label}@users.noreply.reactmap.invalid`
  const usernameFor = (label: string) => `${prefix}-${label}`

  /** Signs a fresh user up, signs them in, and returns their session cookie. */
  async function signUpAndSignIn(label: string) {
    const username = usernameFor(label)
    const password = `correct horse battery staple ${label}`
    await timedFetch(`${baseUrl}/api/auth/sign-up/email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: emailFor(label),
        password,
        name: username,
        username,
      }),
    })
    const signIn = await timedFetch(`${baseUrl}/api/auth/sign-in/username`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    })
    return getSessionCookie(signIn.response)
  }

  return { emailFor, usernameFor, signUpAndSignIn }
}

/**
 * Thin wrapper around a real WebSocket connection. Buffers every parsed
 * message it receives from the moment it is constructed (so nothing is lost
 * between "connect" and "start waiting"), and exposes `mark`/`waitForSince`/
 * `noMatchSince` so a test can assert on messages relative to an action it
 * just took, rather than the whole connection's history.
 */
class AcceptanceSocketClient {
  ws: WebSocket
  received: Array<{ data: any; at: number }>
  url: string

  constructor(wsUrl: string, cookie: string | null) {
    this.url = wsUrl
    this.ws = new WebSocket(wsUrl, {
      headers: cookie ? { Cookie: cookie } : {},
    } as any)
    this.received = []
    this.ws.addEventListener('message', (ev: MessageEvent) => {
      let data: any
      try {
        data = JSON.parse(ev.data)
      } catch {
        data = ev.data
      }
      this.received.push({ data, at: performance.now() })
    })
  }

  /** Waits for the upgrade handshake to complete, or fails with elapsed time. */
  async waitForOpen(timeoutMs = CLIENT_TIMEOUT_MS): Promise<number> {
    const start = performance.now()
    await new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => {
        cleanup()
        reject(
          new Error(
            `WebSocket to ${this.url} did not open within ${timeoutMs}ms ` +
              `(elapsed ${(performance.now() - start).toFixed(0)}ms).`,
          ),
        )
      }, timeoutMs)
      const onOpen = () => {
        cleanup()
        resolve()
      }
      const onError = () => {
        cleanup()
        reject(new Error(`WebSocket to ${this.url} errored before opening.`))
      }
      const cleanup = () => {
        clearTimeout(timer)
        this.ws.removeEventListener('open', onOpen)
        this.ws.removeEventListener('error', onError)
      }
      this.ws.addEventListener('open', onOpen)
      this.ws.addEventListener('error', onError)
    })
    return performance.now() - start
  }

  send(obj: any) {
    this.ws.send(JSON.stringify(obj))
  }

  /** A marker into this connection's message history, for use with the methods below. */
  mark() {
    return this.received.length
  }

  /** Polls until a message matching `predicate`, received at or after `markIdx`, shows up. */
  async waitForSince(
    markIdx: number,
    predicate: (data: any) => boolean,
    timeoutMs: number,
    label: string,
  ): Promise<any> {
    const deadline = performance.now() + timeoutMs
    while (performance.now() < deadline) {
      const hit = this.received
        .slice(markIdx)
        .find((entry) => predicate(entry.data))
      if (hit) return hit.data
      await sleep(50)
    }
    throw new Error(
      `${label} did not arrive within ${timeoutMs}ms. This is a hang/never-arrives ` +
        `failure, not a content mismatch.`,
    )
  }

  /** `waitForSince` over the whole connection history, for tests with no prior action to mark. */
  async waitFor(
    predicate: (data: any) => boolean,
    timeoutMs: number,
    label: string,
  ): Promise<any> {
    return this.waitForSince(0, predicate, timeoutMs, label)
  }

  /** Watches for `windowMs` and fails if any message matching `predicate` shows up. */
  async noMatchSince(
    markIdx: number,
    predicate: (data: any) => boolean,
    windowMs: number,
    label: string,
  ): Promise<boolean> {
    const deadline = performance.now() + windowMs
    while (performance.now() < deadline) {
      const hit = this.received
        .slice(markIdx)
        .find((entry) => predicate(entry.data))
      if (hit) {
        throw new Error(
          `${label}: unexpected message arrived: ${JSON.stringify(hit.data)}`,
        )
      }
      await sleep(100)
    }
    return true
  }

  /** Closes the socket and waits for the close handshake to complete. */
  async closeAndWait(timeoutMs = CLIENT_TIMEOUT_MS): Promise<number> {
    const start = performance.now()
    const closed = new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(
          new Error(
            `WebSocket close handshake did not complete within ${timeoutMs}ms -- ` +
              `the server is holding the connection open after the client asked to leave.`,
          ),
        )
      }, timeoutMs)
      this.ws.addEventListener(
        'close',
        () => {
          clearTimeout(timer)
          resolve()
        },
        { once: true },
      )
    })
    this.ws.close()
    await closed
    return performance.now() - start
  }
}

// ---------------------------------------------------------------------------
// Pokemon/gym fixtures, shaped exactly like Golbat's own JSON encoder would
// produce them.
// ---------------------------------------------------------------------------

interface FixturePokemonOptions {
  id: string
  pokemonId: number
  lat?: number
  lon?: number
  expireTimestamp?: number
  verified?: boolean
  /** Present so a filter suite can hand a rule something to match on. */
  iv?: number | null
  form?: number | null
  gender?: number | null
  size?: number | null
  level?: number | null
}

/** decoder/api_pokemon_response.go:41-79 (ApiPokemonResult json tags). */
function fixturePokemon({
  id,
  pokemonId,
  lat = 40,
  lon = 40,
  expireTimestamp = Math.floor(Date.now() / 1000) + 3600,
  verified = true,
  iv = null,
  form = null,
  gender = null,
  size = null,
  level = null,
}: FixturePokemonOptions) {
  const nowSec = Math.floor(Date.now() / 1000)
  return {
    id,
    pokestop_id: null,
    spawn_id: null,
    lat,
    lon,
    weight: null,
    size,
    height: null,
    expire_timestamp: expireTimestamp,
    updated: nowSec,
    pokemon_id: pokemonId,
    move_1: null,
    move_2: null,
    gender,
    cp: null,
    atk_iv: null,
    def_iv: null,
    sta_iv: null,
    iv,
    form,
    level,
    weather: null,
    costume: null,
    first_seen_timestamp: nowSec,
    changed: nowSec,
    cell_id: null,
    expire_timestamp_verified: verified,
    display_pokemon_id: null,
    display_pokemon_form: null,
    is_ditto: false,
    seen_type: 'wild',
    shiny: false,
    username: null,
    capture_1: null,
    capture_2: null,
    capture_3: null,
    pvp: {},
    is_event: 0,
  }
}

/** golbat/decoder/gym_state.go:165-195 (RaidWebhook json tags). */
function fixtureRaidWebhookMessage({
  gymId,
  level,
  pokemonId,
}: {
  gymId: string
  level: number
  pokemonId: number
}) {
  const nowSec = Math.floor(Date.now() / 1000)
  return {
    gym_id: gymId,
    gym_name: 'Fixture Gym',
    gym_url: 'https://example.invalid/gym.png',
    latitude: 12.34,
    longitude: 56.78,
    team_id: 1,
    spawn: nowSec,
    start: nowSec,
    end: nowSec + 2700,
    level,
    pokemon_id: pokemonId,
    cp: 12345,
    gender: 1,
    form: 0,
    alignment: 0,
    costume: 0,
    evolution: 0,
    move_1: 200,
    move_2: 13,
    ex_raid_eligible: 0,
    is_exclusive: 0,
    sponsor_id: 0,
    partner_id: '',
    power_up_points: 0,
    power_up_level: 0,
    power_up_end_timestamp: 0,
    ar_scan_eligible: 1,
    rsvps: null,
    raid_seed: null,
  }
}

export type { AuthHelpers, FixturePokemonOptions }
export {
  AcceptanceSocketClient,
  CLIENT_TIMEOUT_MS,
  createAuthHelpers,
  fixturePokemon,
  fixtureRaidWebhookMessage,
  getSessionCookie,
  HANG_THRESHOLD_MS,
  sleep,
  timedFetch,
  WORLD_VIEWPORT,
  WS_QUIET_WINDOW_MS,
  WS_WAIT_MS,
  waitForServerReady,
}
