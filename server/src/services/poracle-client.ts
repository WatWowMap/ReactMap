// server/src/services/poracle-client.ts
//
// The only thing in the server that talks to Poracle over HTTP. Holds two
// rules that later tasks depend on:
//
//   1. The shared secret travels in an `X-Poracle-Secret` header and reaches
//      nothing else -- not a URL, not a query string, not an error body, not
//      a log line, not a thrown exception's message.
//   2. A 404 comes back as a status; a transport failure throws. A 404 means
//      the person has no Poracle account, a refused connection means
//      Poracle is down, and those are different answers a later task (the
//      human check) needs to tell apart.
//
// `path` is an already-encoded path suffix such as
// `/v2/humans/123/tracking/pokemon`. Callers build their own segments with
// `encodeURIComponent`; this module does no interpolation of its own.
//
// The `/api` prefix is added HERE and nowhere else. PoracleNG mounts its whole
// authenticated surface on `r.Group("/api")` and its OpenAPI document carries
// no `servers` entry, so every path in the spec reads `/v2/...` and the prefix
// is invisible -- against a live instance `/v2/humans/1/tracking` is a 404 and
// `/api/v2/humans/1/tracking` is a 401. A 404 is the worst way to get that
// wrong, because the human check reads one as "this account has no Poracle":
// a missing prefix would tell every user they are not registered and look
// exactly like the feature working. One base means no route can forget it.

import config from '@rm/config'
import type { Poracle } from '@rm/types'

// The client only reads `host`, `port`, and `poracleSecret` off the config
// it's handed -- `enabled` and the rest of `Poracle` are read straight from
// `@rm/config` by `poracleConfigured`. Narrowing the injected shape to just
// what's used keeps test fixtures (like the one in `poracle-client.test.ts`)
// from having to fake fields this module never touches.
type PoracleConfig = Pick<Poracle, 'host' | 'port' | 'poracleSecret'> &
  Partial<Omit<Poracle, 'host' | 'port' | 'poracleSecret'>>

/** The gin group PoracleNG mounts every authenticated route under. */
const API_PREFIX = '/api'

interface PoracleResponse {
  status: number
  body: any
}

interface PoracleClient {
  get(path: string): Promise<PoracleResponse>
  send(
    method: 'POST' | 'PUT' | 'DELETE',
    path: string,
    body?: unknown,
  ): Promise<PoracleResponse>
}

function poracleConfig(): PoracleConfig {
  return config.getSafe<PoracleConfig>('poracle')
}

function poracleConfigured(deps: { config?: PoracleConfig } = {}): boolean {
  const c = deps.config ?? poracleConfig()
  // Deliberately not requiring `poracleSecret`. Poracle's own middleware
  // skips the check when its API secret is unset (`RequireSecretGin`:
  // `if apiSecret == "" { c.Next() }`), so an instance reachable only on a
  // private network runs without one, and demanding it here reported that
  // deployment as having no Poracle at all -- `status` answered
  // `unconfigured` and the tab never rendered.
  //
  // An operator who sets a host but forgets a secret Poracle *does* want
  // gets 401s, which `checkHuman` maps to `unreachable` rather than
  // `absent`, so it surfaces as a connection problem instead of silently
  // hiding the tab.
  return Boolean(c?.enabled && c?.host)
}

function createPoracleClient(
  deps: { fetch?: typeof fetch; config?: PoracleConfig } = {},
): PoracleClient {
  const doFetch = deps.fetch ?? fetch
  // Injected in tests. `mock.module` is process-wide in bun, so mocking
  // `@rm/config` here would steal the real config from every suite that
  // runs after this one.
  const readConfig = () => deps.config ?? poracleConfig()

  async function call(
    method: string,
    path: string,
    body?: unknown,
  ): Promise<PoracleResponse> {
    const c = readConfig()
    const base = c.port ? `${c.host}:${c.port}` : c.host
    const init: RequestInit = {
      method,
      headers: {
        'X-Poracle-Secret': c.poracleSecret,
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
    }
    if (body !== undefined) init.body = JSON.stringify(body)
    const response = await doFetch(`${base}${API_PREFIX}${path}`, init)
    const text = await response.text()
    let parsed: any = null
    try {
      parsed = text ? JSON.parse(text) : null
    } catch {
      // A non-JSON body is not worth surfacing: it is Poracle's internals,
      // and the status is what every caller here acts on.
      parsed = null
    }
    return { status: response.status, body: parsed }
  }

  return {
    get: (path) => call('GET', path),
    send: (method, path, body) => call(method, path, body),
  }
}

export type { PoracleClient, PoracleConfig, PoracleResponse }
export { createPoracleClient, poracleConfigured }
