# Alerts and Poracle Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A working, fully editable Alerts tab backed by a single Poracle instance, with the authorization model the 1.x audit says it needs.

**Architecture:** A server-side Poracle client that never passes a Poracle response through to a client, reached by tRPC procedures gated on a new `perms.alerts` boolean. The Alerts tab reuses the Filters tab's components by parameterizing `ConditionEditor` and `describeRule` over a vocabulary descriptor, so one editor serves two schemas without either knowing about the other.

**Tech Stack:** Bun 1.4, TypeScript strict + ESM, tRPC v11, TanStack Query, Drizzle (queries) with knex `.cjs` migrations, React 19, shadcn/ui, Biome, `bun:test` with `@testing-library/react`.

**Source spec:** `docs/superpowers/specs/2026-08-25-alerts-poracle-design.md`. Read section 7 before Task 1.

**Out of scope, deliberately:** push and pull (the transfer list dialogs) and the six new `rule` columns are **plan 9**. They depend on this plan's vocabulary refactor and transport being finished. Language, mutes and summary schedules are deferred per spec section 1.

## Global Constraints

- **Filenames are kebab-case.** Every new file, components included. No camelCase, no PascalCase.
- **TypeScript + ESM only.** Never CommonJS, except knex migrations, which are `.cjs` by convention.
- **Never run `bun run format`.** It is `biome check --write`. Run `bun run lint` and fix by hand.
- **The gate is `bun test`, `bun run lint`, `bun run typecheck`.** All three green before any commit.
- **One Poracle instance.** `config.poracle` is an object, never an array. No instance name, no selection, no `selectedWebhook` anywhere.
- **`perms.alerts` is a boolean**, not a list.
- **No procedure returns a Poracle response unmodified.** Every procedure constructs its output object explicitly. This is spec 7.5 and it is not negotiable: tRPC does not prune fields the way GraphQL did.
- **The Poracle human id is derived server-side from the session.** No procedure accepts it as input. This is spec 7.4.
- **The Poracle secret never appears in a procedure output, a log line, or an error body.**
- **Never name the maintainer** in code, comments, docs, or commit messages.
- **Conventional commits** (`feat:`, `fix:`, `test:`, `refactor:`, `docs:`), one per task minimum.

## Poracle API reference

The V2 endpoints this plan uses. `{id}` is the platform id (a Discord snowflake), and Poracle owns
the scoping.

| Purpose | Method and path |
| --- | --- |
| Does this human exist | `GET /v2/humans/{id}`, 404 when not |
| Everything for the tab | `GET /v2/humans/{id}/tracking?all_profiles=true&include_descriptions=true` |
| List one type | `GET /v2/humans/{id}/tracking/pokemon` |
| Create | `POST /v2/humans/{id}/tracking/pokemon?silent=true`, body is an array, returns `{created,updated,unchanged}` |
| Full replace | `PUT /v2/humans/{id}/tracking/pokemon/{uid}`, returns a NEW uid in `{updated}` |
| Delete one | `DELETE /v2/humans/{id}/tracking/pokemon/{uid}` |
| Profiles | `GET|POST /v2/humans/{id}/profiles`, `PATCH|DELETE .../profiles/{profile_no}`, `POST .../profiles/{profile_no}/copy`, `POST .../profile` to switch |
| Areas | `GET|POST /v2/humans/{id}/areas` |
| Saved locations | `GET|POST /v2/humans/{id}/locations`, `GET|PUT|DELETE .../locations/{label}` |
| Enable / disable | `POST /v2/humans/{id}/enable`, `POST /v2/humans/{id}/disable` |

Auth header is `X-Poracle-Secret`.

## File structure

**Server**

| File | Responsibility |
| --- | --- |
| `server/src/utils/alerts-perms.ts` | `alertsPerm(roles, provider)`, replaces `webhook-perms.ts` |
| `server/src/services/poracle-client.ts` | HTTP only. Builds URLs, sends the secret, parses. Knows nothing about tRPC. |
| `server/src/services/poracle-human.ts` | The three-state human check and its session cache |
| `server/src/services/poracle-view.ts` | Maps Poracle rows to the client view model. The no-passthrough boundary. |
| `server/src/trpc/alerts-router.ts` | Procedures, all gated on `perms.alerts` |
| `server/src/trpc/require-perm.ts` | `requirePerm(ctx, 'alerts')` helper |

**Client**

| File | Responsibility |
| --- | --- |
| `app/rules/condition-vocabulary.ts` | The descriptor type and ReactMap's own vocabulary |
| `app/rules/poracle-vocabulary.ts` | Poracle's vocabulary, including its tail |
| `app/alerts/alerts-query.ts` | TanStack Query layer plus the `AlertsClient` seam |
| `app/alerts/alert-card.tsx` | One alert, rendered through the shared card |
| `app/alerts/alert-editor.tsx` | The sheet, wrapping `ConditionEditor` with Poracle's vocabulary |
| `app/alerts/human-panel.tsx` | Profiles, areas, locations, enable/disable |
| `app/pages/alerts-page.tsx` | Replaces the placeholder |

---
## Baseline

`bun test` at plan time: **760 pass, 0 fail, 6973 expect() calls, 88 files, 5.37s.** Every task must
leave that number higher and the failure count at zero.

---

### Task 1: `perms.alerts` and the single-instance config

Closes the audit's blocking finding: `computeDiscordPerms` sets no webhook grant at all, so no
Discord account can reach Poracle. Also collapses `config.webhooks` from an array to one object.

**Files:**
- Create: `server/src/utils/alerts-perms.ts`
- Create: `server/src/utils/alerts-perms.test.ts`
- Delete: `server/src/utils/webhook-perms.ts`
- Modify: `server/src/auth/discord-perms.ts` (add the grant), `server/src/auth/telegram-perms.ts:53`, `server/src/auth/local-perms.ts:62`
- Modify: `config/default.json` (replace `"webhooks": []`), `packages/types/lib/config.d.ts:180-201`

**Interfaces:**
- Produces: `alertsPerm(roles: string[], provider: 'discordRoles' | 'telegramGroups' | 'local'): boolean`
- Produces: config key `poracle`, shape below.

- [ ] **Step 1: Write the failing test**

```ts
// server/src/utils/alerts-perms.test.ts
import { expect, mock, test } from 'bun:test'

mock.module('@rm/config', () => ({
  default: {
    getSafe: (key: string) =>
      key === 'poracle'
        ? {
            enabled: true,
            host: 'http://localhost',
            port: 3030,
            poracleSecret: 's',
            discordRoles: ['role-a'],
            telegramGroups: [],
            local: [],
          }
        : undefined,
  },
}))

const { alertsPerm } = await import('./alerts-perms')

test('a listed role grants alerts', () => {
  expect(alertsPerm(['role-a'], 'discordRoles')).toBe(true)
})

test('an unlisted role does not', () => {
  expect(alertsPerm(['role-b'], 'discordRoles')).toBe(false)
})

test('a provider with no configured roles denies rather than throwing', () => {
  // telegramGroups is [], and a config that omits the key entirely must
  // behave the same way. 1.x relied on optional chaining here; losing it
  // turns a malformed config into a boot crash.
  expect(alertsPerm(['role-a'], 'telegramGroups')).toBe(false)
})

test('no roles is a denial, not a grant', () => {
  // The empty-means-everything idiom elsewhere in this repo (areaPerms)
  // must not leak into a grant.
  expect(alertsPerm([], 'discordRoles')).toBe(false)
})
```

- [ ] **Step 2: Run it and watch it fail**

Run: `bun test server/src/utils/alerts-perms.test.ts`
Expected: FAIL, cannot resolve `./alerts-perms`.

- [ ] **Step 3: Implement**

```ts
// server/src/utils/alerts-perms.ts
import config from '@rm/config'

type AlertsProvider = 'discordRoles' | 'telegramGroups' | 'local'

/**
 * Whether any of these roles grants access to Alerts.
 *
 * A boolean rather than 1.x's list of instance names: there is one Poracle
 * instance, so the only question is whether this account may use it. The
 * optional chaining is load-bearing -- a config that omits a provider's role
 * list must deny, not throw during boot.
 */
function alertsPerm(roles: string[], provider: AlertsProvider): boolean {
  const poracle: any = config.getSafe('poracle')
  if (!poracle?.enabled) return false
  const allowed: string[] | undefined = poracle?.[provider]
  if (!allowed?.length) return false
  return roles.some((role) => allowed.includes(role))
}

export type { AlertsProvider }
export { alertsPerm }
```

- [ ] **Step 4: Wire all three providers, Discord included**

In `server/src/auth/telegram-perms.ts` replace line 53:

```ts
perms.alerts = alertsPerm(user.groups, 'telegramGroups')
```

In `server/src/auth/local-perms.ts` replace line 62:

```ts
perms.alerts = alertsPerm([LOCAL_ROLE], 'local')
```

In `server/src/auth/discord-perms.ts`, inside `basePerms()` so it is set on every branch including
the `allowedUsers` one, add `alerts` alongside the existing keys. Collect the account's role ids
from `guildResults` the same way `permsConfig[key].roles` matching already does, then:

```ts
perms.alerts = alertsPerm(roleIds, 'discordRoles')
```

Discord is the platform Poracle DMs through. Leaving it unset is what this task exists to fix.

- [ ] **Step 5: Replace the config shape**

In `config/default.json`, delete `"webhooks": []` and add:

```json
"poracle": {
  "enabled": false,
  "host": "http://localhost",
  "port": 3030,
  "poracleSecret": "",
  "addressFormat": "",
  "nominatimUrl": "",
  "geocoderProvider": "nominatim",
  "areasToSkip": [],
  "discordRoles": [],
  "telegramGroups": [],
  "local": []
}
```

In `packages/types/lib/config.d.ts`, replace the `Webhook` interface with:

```ts
export interface Poracle {
  enabled: boolean
  host: string
  port: number
  poracleSecret: string
  addressFormat?: string
  nominatimUrl?: string
  geocoderProvider?: 'nominatim' | 'photon'
  areasToSkip: string[]
  discordRoles: string[]
  telegramGroups: string[]
  local: string[]
}
```

`provider: 'poracle'` and `name` are gone because there is one instance. `trialPeriodEligible` is
gone because the trial period is already absent from 2.0.

- [ ] **Step 6: Delete the old module and confirm nothing imports it**

```bash
rm server/src/utils/webhook-perms.ts
grep -rn "webhook-perms\|webhookPerms\|perms\.webhooks\|getSafe('webhooks')" server/src app packages
```

Expected: no matches.

- [ ] **Step 7: Full gate, then commit**

```bash
bun test && bun run lint && bun run typecheck
git add -A
git commit -m "feat(auth): grant Alerts access to Discord accounts

computeDiscordPerms set no webhook grant at all, while telegram-perms and
local-perms both did, so no Discord account could reach Poracle. Discord is
the platform Poracle sends DMs through, which made this the whole feature.

Replaces webhookPerms with alertsPerm, a boolean rather than a list of
instance names, and collapses config.webhooks to a single config.poracle
object. provider: 'poracle' was the only value that field carried and
trialPeriodEligible has no trial period left to gate."
```

---

### Task 2: Permission enforcement for tRPC procedures

`server/src/trpc/context.ts` says outright that "nothing in this task enforces a permission on any
procedure". The context carries a Better Auth user and no perms at all. Alerts cannot ship on that.

**Files:**
- Create: `server/src/trpc/require-perm.ts`, `server/src/trpc/require-perm.test.ts`
- Modify: `server/src/trpc/context.ts`, `server/src/trpc/trpc-base.ts`

**Interfaces:**
- Consumes: `mergePerms` from `server/src/settings-response.ts`
- Produces: `requirePerm(ctx: Context, perm: string): string` returning the user id, throwing `FORBIDDEN` otherwise. `Context` gains `perms: Record<string, any> | null`.

- [ ] **Step 1: Write the failing test**

```ts
// server/src/trpc/require-perm.test.ts
import { expect, test } from 'bun:test'
import { requirePerm } from './require-perm'

test('a granted perm returns the user id', () => {
  const ctx = { user: { id: 'u1' }, session: null, perms: { alerts: true } }
  expect(requirePerm(ctx as any, 'alerts')).toBe('u1')
})

test('a signed-out visitor is UNAUTHORIZED, not FORBIDDEN', () => {
  // The two are different to a client: one is "sign in", the other is
  // "signing in will not help".
  const ctx = { user: null, session: null, perms: null }
  expect(() => requirePerm(ctx as any, 'alerts')).toThrow(/Sign in/)
})

test('a signed-in user without the perm is FORBIDDEN', () => {
  const ctx = { user: { id: 'u1' }, session: null, perms: { alerts: false } }
  expect(() => requirePerm(ctx as any, 'alerts')).toThrow(/not available/)
})

test('an absent perms object denies rather than defaulting to allowed', () => {
  // The failure mode spec 7.6 names: `perms.alerts ?? true` would be a
  // silent grant to every account whose provider forgot the key.
  const ctx = { user: { id: 'u1' }, session: null, perms: {} }
  expect(() => requirePerm(ctx as any, 'alerts')).toThrow(/not available/)
})
```

- [ ] **Step 2: Run it and watch it fail**

Run: `bun test server/src/trpc/require-perm.test.ts`
Expected: FAIL, cannot resolve `./require-perm`.

- [ ] **Step 3: Implement**

```ts
// server/src/trpc/require-perm.ts
import { TRPCError } from '@trpc/server'
import type { Context } from './trpc-base'

/**
 * The signed-in user id, if this account holds `perm`.
 *
 * Resolved from perms on every call and never from a column on the user row.
 * That is the correction to 1.x's `selectedWebhook`, which was stored once and
 * read everywhere, so revoking a role left the capability in place -- see spec
 * section 7.2.
 *
 * A missing key is a denial. Never `?? true`, and never treat an absent perms
 * object as permissive: `areaPerms` already establishes empty-means-everything
 * as an idiom in this repo, and it must not leak into a grant.
 */
function requirePerm(ctx: Context, perm: string): string {
  const userId = ctx.user?.id ?? ctx.session?.userId
  if (!userId) {
    throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Sign in to use this' })
  }
  if (ctx.perms?.[perm] !== true) {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: 'That feature is not available on this account',
    })
  }
  return userId
}

export { requirePerm }
```

- [ ] **Step 4: Load perms into the context**

Add `perms?: Record<string, any> | null` to the `Context` interface in `trpc-base.ts`.

In `context.ts`, after resolving the session, load and fold the rows exactly as
`settings-response.ts` does, and return `perms` on the context. Add a `getPerms` dependency to
`createContextFactory` so a test can inject one, matching how `buildSettingsResponse` takes its
deps. An anonymous context gets `perms: null`.

- [ ] **Step 5: Gate and commit**

```bash
bun test && bun run lint && bun run typecheck
git add -A
git commit -m "feat(trpc): enforce permissions on procedures

The context carried a Better Auth user and no perms, and its own comment
recorded that no procedure enforced a permission. requirePerm resolves the
grant from perms on every call rather than from a column on the user row,
which is the correction to 1.x's selectedWebhook: that was stored once and
read everywhere, so losing a role left the capability in place.

A missing key denies. An absent perms object denies."
```

---

### Task 3: The Poracle HTTP client

HTTP only. No tRPC, no view model, no knowledge of who is asking.

**Files:**
- Create: `server/src/services/poracle-client.ts`, `server/src/services/poracle-client.test.ts`

**Interfaces:**
- Produces:
  ```ts
  interface PoracleClient {
    get(path: string): Promise<{ status: number; body: any }>
    send(method: 'POST' | 'PUT' | 'DELETE', path: string, body?: unknown): Promise<{ status: number; body: any }>
  }
  function createPoracleClient(deps?: { fetch?: typeof fetch; config?: PoracleConfig }): PoracleClient
  function poracleConfigured(): boolean
  ```
- Paths passed in are already-encoded path suffixes such as `/v2/humans/123/tracking/pokemon`. Callers build them with `encodeURIComponent`.

- [ ] **Step 1: Write the failing test**

`mock.module` is process-wide in bun. A second test file mocking `@rm/config` steals the real
config from every suite that runs after it, which took the whole run to six unrelated failures
during Task 1. So this client takes its config as an injected dep instead, matching how
`buildSettingsResponse` in `server/src/settings-response.ts` already takes `getSession` and
`getPerms`. Do not call `mock.module` in this file.

```ts
// server/src/services/poracle-client.test.ts
import { expect, test } from 'bun:test'
import { createPoracleClient } from './poracle-client'

const CONFIG = {
  enabled: true,
  host: 'http://poracle.test',
  port: 3030,
  poracleSecret: 'shhh',
}

test('sends the secret as a header and never in the URL', async () => {
  let seenUrl = ''
  let seenHeaders: any = {}
  const client = createPoracleClient({
    config: CONFIG,
    fetch: (async (url: any, init: any) => {
      seenUrl = String(url)
      seenHeaders = init.headers
      return new Response('{"ok":true}', { status: 200 })
    }) as any,
  })

  await client.get('/v2/humans/123')

  expect(seenUrl).toBe('http://poracle.test:3030/v2/humans/123')
  expect(seenHeaders['X-Poracle-Secret']).toBe('shhh')
  expect(seenUrl).not.toContain('shhh')
})

test('a 404 is returned as a status, not thrown', async () => {
  // The human check needs to tell 404 (no human) from a transport failure.
  // Throwing on both would collapse two of the three states in spec 6.
  const client = createPoracleClient({
    config: CONFIG,
    fetch: (async () => new Response('{}', { status: 404 })) as any,
  })
  const res = await client.get('/v2/humans/nobody')
  expect(res.status).toBe(404)
})

test('a transport failure throws so it cannot be mistaken for a 404', async () => {
  const client = createPoracleClient({
    config: CONFIG,
    fetch: (async () => {
      throw new Error('ECONNREFUSED')
    }) as any,
  })
  await expect(client.get('/v2/humans/123')).rejects.toThrow()
})

test('the secret never reaches an error message', async () => {
  const client = createPoracleClient({
    config: CONFIG,
    fetch: (async () => new Response('nope', { status: 500 })) as any,
  })
  const res = await client.get('/v2/humans/123')
  expect(JSON.stringify(res)).not.toContain('shhh')
})
```

- [ ] **Step 2: Run it and watch it fail**

Run: `bun test server/src/services/poracle-client.test.ts`
Expected: FAIL, cannot resolve `./poracle-client`.

- [ ] **Step 3: Implement**

```ts
// server/src/services/poracle-client.ts
import config from '@rm/config'

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

function poracleConfig(): any {
  return config.getSafe('poracle')
}

function poracleConfigured(): boolean {
  const c = poracleConfig()
  return Boolean(c?.enabled && c?.host && c?.poracleSecret)
}

/**
 * The only thing in the server that talks to Poracle.
 *
 * Two rules it exists to hold. The secret goes in a header and never into a
 * URL or an error body. And a 404 comes back as a status while a transport
 * failure throws, because the human check has to tell "no human" from
 * "Poracle is down" and those are different answers (spec section 6).
 *
 * `path` is an already-encoded suffix. Callers encode their own segments;
 * this deliberately does no interpolation of its own.
 */
function createPoracleClient(
  deps: { fetch?: typeof fetch; config?: any } = {},
): PoracleClient {
  const doFetch = deps.fetch ?? fetch
  // Injected in tests. `mock.module` is process-wide in bun, so mocking
  // `@rm/config` here would steal the real config from every suite that runs
  // after this one.
  const readConfig = () => deps.config ?? poracleConfig()

  async function call(
    method: string,
    path: string,
    body?: unknown,
  ): Promise<PoracleResponse> {
    const c = readConfig()
    const base = c.port ? `${c.host}:${c.port}` : c.host
    const response = await doFetch(`${base}${path}`, {
      method,
      headers: {
        'X-Poracle-Secret': c.poracleSecret,
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    })
    const text = await response.text()
    let parsed: any = null
    try {
      parsed = text ? JSON.parse(text) : null
    } catch {
      // A non-JSON body is not worth surfacing: it is Poracle's internals,
      // and the status is what any caller here acts on.
      parsed = null
    }
    return { status: response.status, body: parsed }
  }

  return {
    get: (path) => call('GET', path),
    send: (method, path, body) => call(method, path, body),
  }
}

export type { PoracleClient, PoracleResponse }
export { createPoracleClient, poracleConfigured }
```

- [ ] **Step 4: Confirm green**

Run: `bun test server/src/services/poracle-client.test.ts`
Expected: PASS, 4 tests.

- [ ] **Step 5: Gate and commit**

```bash
bun test && bun run lint && bun run typecheck
git add server/src/services/poracle-client.ts server/src/services/poracle-client.test.ts
git commit -m "feat(poracle): add the HTTP client

Holds two rules. The secret travels in a header and never reaches a URL or an
error body. And a 404 returns as a status while a transport failure throws,
because the human check has to distinguish an absent human from an
unreachable Poracle, and collapsing those two would lose one of the three
states the Alerts tab renders."
```

---

### Task 4: The human check and its three states

**Files:**
- Create: `server/src/services/poracle-human.ts`, `server/src/services/poracle-human.test.ts`

**Interfaces:**
- Consumes: `PoracleClient` from Task 3.
- Produces:
  ```ts
  type HumanState = 'present' | 'absent' | 'unreachable'
  function checkHuman(client: PoracleClient, platformId: string): Promise<HumanState>
  function cachedHumanState(userId: string): HumanState | undefined
  function rememberHumanState(userId: string, state: HumanState): void
  function resolveHumanState(client: PoracleClient, userId: string, platformId: string): Promise<HumanState>
  ```

- [ ] **Step 1: Write the failing test**

```ts
// server/src/services/poracle-human.test.ts
import { beforeEach, expect, test } from 'bun:test'
import {
  __resetHumanCache,
  checkHuman,
  resolveHumanState,
} from './poracle-human'

const ok = { get: async () => ({ status: 200, body: { id: '1' } }) } as any
const missing = { get: async () => ({ status: 404, body: null }) } as any
const down = {
  get: async () => {
    throw new Error('ECONNREFUSED')
  },
} as any

beforeEach(__resetHumanCache)

test('200 is present', async () => {
  expect(await checkHuman(ok, '123')).toBe('present')
})

test('404 is absent, which hides the tab entirely', async () => {
  expect(await checkHuman(missing, '123')).toBe('absent')
})

test('a transport failure is unreachable, which is not absent', async () => {
  expect(await checkHuman(down, '123')).toBe('unreachable')
})

test('unreachable keeps the last known answer', async () => {
  // A thirty second Poracle restart must not make the tab vanish for
  // everyone mid-session. This is the whole reason the answer is cached.
  expect(await resolveHumanState(ok, 'u1', '123')).toBe('present')
  expect(await resolveHumanState(down, 'u1', '123')).toBe('present')
})

test('a first-ever login during an outage gets no tab', async () => {
  // Nothing cached, so there is no last known answer to keep.
  expect(await resolveHumanState(down, 'u-new', '123')).toBe('unreachable')
})

test('an absent human is cached too, so a 404 is not re-fetched every load', async () => {
  expect(await resolveHumanState(missing, 'u2', '123')).toBe('absent')
  expect(await resolveHumanState(down, 'u2', '123')).toBe('absent')
})
```

- [ ] **Step 2: Run it and watch it fail**

Run: `bun test server/src/services/poracle-human.test.ts`
Expected: FAIL, cannot resolve `./poracle-human`.

- [ ] **Step 3: Implement**

```ts
// server/src/services/poracle-human.ts
import type { PoracleClient } from './poracle-client'

type HumanState = 'present' | 'absent' | 'unreachable'

/**
 * Whether this person has a Poracle human, cached per user for the session.
 *
 * ReactMap never creates one. Poracle does that when the right Discord roles
 * land, so the only question here is whether one exists.
 *
 * Three states, not two, and 1.x could not tell two of them apart: it gated on
 * a role-derived permission and called oneHuman only to read blocked_alerts,
 * so a missing human and a dead Poracle both produced an empty tab with dead
 * buttons. Poracle's own responses separate them cleanly -- resolveHuman 404s
 * an unknown id and never autocreates.
 */
const cache = new Map<string, HumanState>()

function cachedHumanState(userId: string): HumanState | undefined {
  return cache.get(userId)
}

function rememberHumanState(userId: string, state: HumanState): void {
  cache.set(userId, state)
}

/** Test seam. Module state would otherwise leak between tests. */
function __resetHumanCache(): void {
  cache.clear()
}

async function checkHuman(
  client: PoracleClient,
  platformId: string,
): Promise<HumanState> {
  try {
    const res = await client.get(`/v2/humans/${encodeURIComponent(platformId)}`)
    if (res.status === 404) return 'absent'
    if (res.status >= 200 && res.status < 300) return 'present'
    return 'unreachable'
  } catch {
    return 'unreachable'
  }
}

/**
 * The cached answer, refreshed when it can be. An unreachable Poracle keeps
 * whatever was last known rather than downgrading a working tab, which is what
 * stops a brief restart from hiding Alerts for everyone at once.
 */
async function resolveHumanState(
  client: PoracleClient,
  userId: string,
  platformId: string,
): Promise<HumanState> {
  const state = await checkHuman(client, platformId)
  if (state === 'unreachable') {
    return cache.get(userId) ?? 'unreachable'
  }
  cache.set(userId, state)
  return state
}

export type { HumanState }
export {
  __resetHumanCache,
  cachedHumanState,
  checkHuman,
  rememberHumanState,
  resolveHumanState,
}
```

- [ ] **Step 4: Confirm green, then gate and commit**

```bash
bun test server/src/services/poracle-human.test.ts
bun test && bun run lint && bun run typecheck
git add server/src/services/poracle-human.ts server/src/services/poracle-human.test.ts
git commit -m "feat(poracle): resolve the three human states

ReactMap never creates a Poracle human; Poracle does that when Discord roles
land. So the check is whether one exists, and there are three answers rather
than two.

1.x could not tell two of them apart. It gated on a role-derived permission,
called oneHuman only to read blocked_alerts, and rendered an empty tab with
dead buttons whether the human was missing or Poracle was down. Its own
unused error screen said 'You may not be registered with X or the server is
currently unreachable', which is the same confusion in user-facing copy.

Unreachable keeps the last known answer so a brief restart does not hide the
tab for everyone mid-session. A first login during an outage has nothing
cached and gets no tab."
```

---

### Task 5: The view mapper, and the no-passthrough boundary

Spec 7.5: several 1.x paths returned raw Poracle bodies and leaked nothing only because the GraphQL
schema pruned unknown fields. tRPC does not. Every procedure output is constructed here.

**Files:**
- Create: `server/src/services/poracle-view.ts`, `server/src/services/poracle-view.test.ts`

**Interfaces:**
- Produces:
  ```ts
  interface AlertRow {
    uid: number
    profileNo: number
    pokemonId: number
    form: number
    costume: number
    ping: string
    clean: boolean
    distance: number
    template: string
    overrideLocationLabel: string | null
    ivMin: number; ivMax: number
    cpMin: number; cpMax: number
    levelMin: number; levelMax: number
    atkMin: number; atkMax: number
    defMin: number; defMax: number
    staMin: number; staMax: number
    gender: number
    weightMin: number; weightMax: number
    minTime: number
    rarityMin: number; rarityMax: number
    sizeMin: number; sizeMax: number
    pvpLeague: number; pvpRankBest: number; pvpRankWorst: number
    pvpMinCp: number; pvpCap: number
    description: string | null
  }
  interface HumanView { enabled: boolean; currentProfileNo: number; latitude: number | null; longitude: number | null; areas: string[] }
  interface ProfileView { profileNo: number; name: string }
  interface LocationView { label: string; latitude: number; longitude: number }
  interface AlertsSnapshot { human: HumanView; alerts: AlertRow[]; profiles: ProfileView[]; locations: LocationView[] }
  function toAlertsSnapshot(body: any): AlertsSnapshot
  ```

- [ ] **Step 1: Write the failing test**

```ts
// server/src/services/poracle-view.test.ts
import { expect, test } from 'bun:test'
import { toAlertsSnapshot } from './poracle-view'

const SNAPSHOT = {
  human: {
    id: '123',
    name: 'someone',
    enabled: 1,
    current_profile_no: 2,
    latitude: 42.35,
    longitude: -71.06,
    area: '["downtown"]',
    // Fields a client must never receive:
    admin_disable: 0,
    blocked_alerts: '[]',
    community_membership: '[]',
  },
  tracking: {
    pokemon: [
      {
        uid: 7,
        id: '123',
        profile_no: 2,
        ping: '<@123>',
        clean: 1,
        distance: 5000,
        template: 'default',
        pokemon_id: 149,
        form: 0,
        costume: 0,
        min_iv: 90,
        max_iv: 100,
        min_cp: 0,
        max_cp: 4096,
        min_level: 1,
        max_level: 40,
        atk: 0,
        max_atk: 15,
        def: 0,
        max_def: 15,
        sta: 0,
        max_sta: 15,
        gender: 0,
        min_weight: 0,
        max_weight: 9999999,
        min_time: 0,
        rarity: -1,
        max_rarity: 6,
        size: -1,
        max_size: 5,
        pvp_ranking_league: 0,
        pvp_ranking_best: 1,
        pvp_ranking_worst: 4096,
        pvp_ranking_min_cp: 1,
        pvp_ranking_cap: 0,
        override_location_label: null,
        description: 'Dragonite 90%+',
      },
    ],
    raid: [],
  },
  profiles: [{ profile_no: 2, name: 'default' }],
  locations: { locations: [{ label: 'work', latitude: 1, longitude: 2 }] },
  summaries: [],
  mutes: [],
}

test('maps a monster row into the view model', () => {
  const view = toAlertsSnapshot(SNAPSHOT)
  expect(view.alerts).toHaveLength(1)
  expect(view.alerts[0]).toMatchObject({
    uid: 7,
    pokemonId: 149,
    ivMin: 90,
    ivMax: 100,
    clean: true,
    distance: 5000,
    description: 'Dragonite 90%+',
  })
})

test('drops every field the client has no business seeing', () => {
  // This is the whole point of the module. Under GraphQL, unknown fields were
  // pruned by the schema; tRPC returns whatever it is handed.
  const serialised = JSON.stringify(toAlertsSnapshot(SNAPSHOT))
  for (const leak of ['admin_disable', 'blocked_alerts', 'community_membership', 'poracleSecret']) {
    expect(serialised).not.toContain(leak)
  }
})

test('the output carries exactly its declared keys and nothing else', () => {
  // The denylist above only catches fields somebody thought to name. This
  // catches the ones nobody did, which is the case that actually bites:
  // Poracle adds a column, the mapper spreads it through, and no test fails.
  const view = toAlertsSnapshot(SNAPSHOT)
  expect(Object.keys(view).sort()).toEqual([
    'alerts', 'human', 'locations', 'profiles',
  ])
  expect(Object.keys(view.human).sort()).toEqual([
    'areas', 'currentProfileNo', 'enabled', 'latitude', 'longitude',
  ])
})

test('a field Poracle adds later does not reach the client', () => {
  // The inverse of the mapping rule, stated directly. An implementation that
  // spreads the source row passes every other test in this file and fails
  // this one.
  const withNewField = {
    ...SNAPSHOT,
    human: { ...SNAPSHOT.human, some_future_column: 'leaked' },
    tracking: {
      ...SNAPSHOT.tracking,
      pokemon: [{ ...SNAPSHOT.tracking.pokemon[0], another_new_one: 'leaked' }],
    },
  }
  expect(JSON.stringify(toAlertsSnapshot(withNewField))).not.toContain('leaked')
})

test('only the pokemon tracking type crosses the boundary', () => {
  // Pokemon only, per the spec. A raid array arriving must not appear.
  expect(JSON.stringify(toAlertsSnapshot(SNAPSHOT))).not.toContain('raid')
})

test('reads the human areas out of the JSON string Poracle stores', () => {
  expect(toAlertsSnapshot(SNAPSHOT).human.areas).toEqual(['downtown'])
})

test('a malformed area string yields no areas rather than throwing', () => {
  const bad = { ...SNAPSHOT, human: { ...SNAPSHOT.human, area: 'not json' } }
  expect(toAlertsSnapshot(bad).human.areas).toEqual([])
})
```

- [ ] **Step 2: Run it and watch it fail**

Run: `bun test server/src/services/poracle-view.test.ts`
Expected: FAIL, cannot resolve `./poracle-view`.

- [ ] **Step 3: Implement**

Write `toAlertsSnapshot` mapping each field named in the Interfaces block above, reading only
`body.tracking.pokemon`, and parsing `human.area` inside a `try`/`catch` that falls back to `[]`.
Build every object with explicit literals. Never spread a Poracle object into an output.

- [ ] **Step 4: Confirm green, then gate and commit**

```bash
bun test server/src/services/poracle-view.test.ts
bun test && bun run lint && bun run typecheck
git add server/src/services/poracle-view.ts server/src/services/poracle-view.test.ts
git commit -m "feat(poracle): construct every client-facing object explicitly

1.x returned raw Poracle bodies from two paths and leaked nothing only
because type Poracle declared no matching fields, so Apollo dropped them.
That was the transport pruning responses, not an authorization check.

2.0 is tRPC and returns whatever a procedure returns, so porting the old
dispatch shape would turn an accidental deny-by-default into an
allow-by-default. Every output object is built from explicit literals here,
and the tests assert that admin_disable, blocked_alerts and
community_membership never cross the boundary."
```

---
### Task 6: The alerts router, read side

**Files:**
- Create: `server/src/trpc/alerts-router.ts`, `server/src/trpc/alerts-router.test.ts`
- Modify: `server/src/trpc/router.ts` (merge `alertsRouter`)

**Interfaces:**
- Consumes: `requirePerm` (Task 2), `createPoracleClient`/`poracleConfigured` (Task 3), `resolveHumanState` (Task 4), `toAlertsSnapshot` (Task 5).
- Produces:
  ```ts
  alertsRouter.status  // query -> { state: HumanState | 'unconfigured'; pokemonBlocked: boolean }
  alertsRouter.snapshot // query -> AlertsSnapshot
  function resolvePlatformId(db: any, userId: string): Promise<string | null>
  ```

`resolvePlatformId` reads the Better Auth `account` table for this user's `providerId: 'discord'`
row and returns its `accountId`. That is the Poracle human id, and it is the value spec 7.4 says a
client may never influence.

- [ ] **Step 1: Write the failing test**

```ts
// server/src/trpc/alerts-router.test.ts
import { expect, test } from 'bun:test'
import { alertsRouter } from './alerts-router'

function caller(ctx: any) {
  return alertsRouter.createCaller(ctx)
}

const BASE = {
  user: { id: 'u1' },
  session: null,
  perms: { alerts: true },
  poracleClient: { get: async () => ({ status: 200, body: SNAPSHOT_BODY }) },
  platformId: '123',
}

const SNAPSHOT_BODY = {
  human: { enabled: 1, current_profile_no: 1, latitude: null, longitude: null, area: '[]' },
  tracking: { pokemon: [] },
  profiles: [],
  locations: { locations: [] },
}

test('snapshot requires the alerts perm', async () => {
  const ctx = { ...BASE, perms: { alerts: false } }
  await expect(caller(ctx).snapshot()).rejects.toThrow(/not available/)
})

test('snapshot requires a signed-in user', async () => {
  const ctx = { ...BASE, user: null, perms: null }
  await expect(caller(ctx).snapshot()).rejects.toThrow(/Sign in/)
})

test('the platform id is never accepted as input', () => {
  // Structural: spec 7.4. If this ever gains an input schema with an id in
  // it, that is the impersonation hole, so assert on the shape rather than
  // trying to exploit it.
  const def: any = (alertsRouter as any)._def.procedures.snapshot._def
  expect(def.inputs ?? []).toHaveLength(0)
})

test('status reports unconfigured when no Poracle is set up', async () => {
  const ctx = { ...BASE, poracleClient: null }
  expect(await caller(ctx).status()).toEqual({ state: 'unconfigured' })
})

test('an account with no linked Discord identity is absent, not a crash', async () => {
  const ctx = { ...BASE, platformId: null }
  expect(await caller(ctx).status()).toMatchObject({ state: 'absent' })
})

test('a human blocked from monster alerts gets a live tab that cannot write', async () => {
  // 1.x's getAllowedCategories subtracted disabledHooks and the human's own
  // blocked_alerts from the category list. With one category there is no list
  // left, but the subtraction still decides whether this account may use it.
  const ctx = {
    ...BASE,
    poracleClient: {
      get: async () => ({
        status: 200,
        body: { ...SNAPSHOT_BODY, human: { ...SNAPSHOT_BODY.human, blocked_alerts: '["monster"]' } },
      }),
    },
  }
  expect(await caller(ctx).status()).toMatchObject({ state: 'present', pokemonBlocked: true })
})

test('an operator-disabled category blocks it for everyone', async () => {
  const ctx = { ...BASE, poracleConfig: { disabledHooks: ['monster'] } }
  expect(await caller(ctx).status()).toMatchObject({ pokemonBlocked: true })
})

test('blocked_alerts that is null does not crash and does not block', async () => {
  // 1.x read human.blocked_alerts off an undefined human and threw, which is
  // how a dead Poracle became an empty tab with dead buttons.
  const ctx = {
    ...BASE,
    poracleClient: {
      get: async () => ({ status: 200, body: { ...SNAPSHOT_BODY, human: { ...SNAPSHOT_BODY.human, blocked_alerts: null } } }),
    },
  }
  expect(await caller(ctx).status()).toMatchObject({ pokemonBlocked: false })
})
```

- [ ] **Step 2: Run it and watch it fail**

Run: `bun test server/src/trpc/alerts-router.test.ts`
Expected: FAIL, cannot resolve `./alerts-router`.

- [ ] **Step 3: Implement**

Both procedures are `t.procedure` with **no input schema at all**. Each calls
`requirePerm(ctx, 'alerts')`, resolves the platform id from the context (falling back to
`resolvePlatformId(db, userId)` when the context did not pre-resolve one), and returns an object
built by `toAlertsSnapshot`. `status` returns `state: 'unconfigured'` when `poracleConfigured()` is false, and
`state: 'absent'` when there is no linked platform id.

`pokemonBlocked` is 1.x's `getAllowedCategories` subtraction, reduced to the one category this
plan ships: true when `config.poracle.disabledHooks` contains `monster`, or when the human's own
`blocked_alerts` does. Parse `blocked_alerts` inside a `try`/`catch` returning `[]`. 1.x read that
field off a possibly-undefined human and threw, which is exactly how a dead Poracle turned into an
empty tab with dead buttons.

Extend `Context` in `trpc-base.ts` with `poracleClient?: PoracleClient | null` and
`platformId?: string | null`, and build them in `context.ts` the same way `golbatClient` already is.

- [ ] **Step 4: Merge into the root router**

In `server/src/trpc/router.ts`, add `alerts: alertsRouter` beside the existing `rules` entry.

- [ ] **Step 5: Gate and commit**

```bash
bun test && bun run lint && bun run typecheck
git add -A
git commit -m "feat(trpc): add the alerts read procedures

Both procedures take no input at all. The Poracle human id is resolved server
side from the session's linked Discord account, which is the one value spec
section 7.4 says a client must never influence, and a test asserts the
absence of an input schema structurally rather than by trying to exploit it.

Every output goes through toAlertsSnapshot, so nothing Poracle returns
reaches a client unmodified."
```

---

### Task 7: The condition vocabulary, and `describeRule` over it

Pure refactor. Filters behaviour must not change, and its existing tests are the proof.

**Files:**
- Create: `app/rules/condition-vocabulary.ts`, `app/rules/condition-vocabulary.test.ts`
- Modify: `app/rules/describe-rule.ts`, `app/rules/rule-conditions.ts`

**Interfaces:**
- Produces:
  ```ts
  interface RangeCondition {
    kind: 'range'
    key: string
    label: string
    minField: string
    maxField: string
    suffix?: string
    /** Renders a bound as a word instead of a number, e.g. XXS..XXL. */
    words?: Record<number, string>
  }
  interface ChoiceCondition {
    kind: 'choice'
    key: string
    label: string
    field: string
    options: { value: number; label: string }[]
  }
  interface ToggleCondition { kind: 'toggle'; key: string; label: string; field: string }
  interface TextCondition { kind: 'text'; key: string; label: string; field: string }
  type ConditionDef = RangeCondition | ChoiceCondition | ToggleCondition | TextCondition
  interface Vocabulary {
    id: 'reactmap' | 'poracle'
    conditions: ConditionDef[]
    /** Appearance or delivery, rendered after the conditions in the sentence. */
    tail: ConditionDef[]
  }
  const REACTMAP_VOCABULARY: Vocabulary
  function describeWithVocabulary(row: Record<string, any>, vocab: Vocabulary): string
  ```

- [ ] **Step 1: Write the failing test**

```ts
// app/rules/condition-vocabulary.test.ts
import { expect, test } from 'bun:test'
import {
  describeWithVocabulary,
  REACTMAP_VOCABULARY,
} from './condition-vocabulary'

test('equal bounds read as one value', () => {
  const row = { ivMin: 100, ivMax: 100 }
  expect(describeWithVocabulary(row, REACTMAP_VOCABULARY)).toBe('IV 100%')
})

test('an unbounded condition is not mentioned', () => {
  expect(describeWithVocabulary({ size: 'lg' }, REACTMAP_VOCABULARY)).toBe('large')
})

test('a vocabulary with no matching fields says what it does', () => {
  expect(describeWithVocabulary({}, REACTMAP_VOCABULARY)).toBe('shown normally')
})

test('a foreign vocabulary renders its own fields and none of ReactMap\'s', () => {
  // The refactor's whole purpose: the renderer must not know which schema
  // it is looking at.
  const vocab = {
    id: 'poracle' as const,
    conditions: [
      { kind: 'range' as const, key: 'weight', label: 'weight', minField: 'weightMin', maxField: 'weightMax' },
    ],
    tail: [],
  }
  expect(describeWithVocabulary({ weightMin: 5, weightMax: 5, ivMin: 100 }, vocab)).toBe('weight 5')
})
```

- [ ] **Step 2: Run it and watch it fail**

Run: `bun test app/rules/condition-vocabulary.test.ts`
Expected: FAIL, cannot resolve `./condition-vocabulary`.

- [ ] **Step 3: Implement**

Move the `range()` helper, `SIZE_WORD`, `LEAGUE_WORD`, `SIZE_RANGE_WORD` and `GENDER_WORD` out of
`describe-rule.ts` and express each as a `ConditionDef` in `REACTMAP_VOCABULARY`, in the order
`describe-rule.ts` currently lists them: IV, attack, defence, stamina, level, CP, gender, size
range, PvP, exclusions, then the tail of size, glow, notify. `describeWithVocabulary` walks
`conditions` then `tail`, joins with `' · '`, and returns `'shown normally'` when nothing rendered.

- [ ] **Step 4: Reduce `describeRule` to a call**

```ts
// app/rules/describe-rule.ts
export function describeRule(rule: Rule): string {
  return describeWithVocabulary(rule as any, REACTMAP_VOCABULARY)
}
```

- [ ] **Step 5: Prove Filters did not change**

Run: `bun test app/rules/describe-rule.test.ts`
Expected: PASS, all 8 existing tests, unmodified. If any needs editing, the refactor changed
behaviour and is wrong.

- [ ] **Step 6: Gate and commit**

```bash
bun test && bun run lint && bun run typecheck
git add -A
git commit -m "refactor(rules): describe a rule through a vocabulary

Lifts the hardcoded column knowledge out of describeRule into a descriptor,
so the same renderer can serve both ReactMap's rule shape and Poracle's
monster shape. §4 of the client shape spec forbids the editor coupling to
Poracle's schema, and a descriptor keeps that coupling in one boundary file
rather than spread through the components.

Pure refactor: describe-rule.test.ts is unchanged and still passes."
```

---

### Task 8: `ConditionEditor` over a vocabulary

Also a pure refactor. `condition-editor.test.tsx` and `rule-sheet.test.tsx` must pass unmodified.

**Files:**
- Modify: `app/rules/condition-editor.tsx`, `app/rules/rule-conditions.ts`, `app/rules/rule-sheet.tsx`

**Interfaces:**
- Consumes: `Vocabulary`, `REACTMAP_VOCABULARY`, `ConditionDef` (Task 7).
- Produces: `ConditionEditorProps` gains `vocabulary?: Vocabulary`, defaulting to `REACTMAP_VOCABULARY`. `conditionSeeds(row, vocab?)` gains the same optional second parameter.

- [ ] **Step 1: Write the failing test**

```ts
// append to app/rules/condition-editor.test.tsx
test('a foreign vocabulary offers its own conditions and none of ReactMap\'s', () => {
  const vocab = {
    id: 'poracle' as const,
    conditions: [
      { kind: 'range' as const, key: 'weight', label: 'Weight', minField: 'weightMin', maxField: 'weightMax' },
    ],
    tail: [],
  }
  render(<ConditionEditor vocabulary={vocab} />)
  fireEvent.click(screen.getByRole('button', { name: /add condition/i }))
  expect(screen.getByText('Weight')).toBeTruthy()
  expect(screen.queryByText('IV')).toBeNull()
})
```

- [ ] **Step 2: Run it and watch it fail**

Run: `bun test app/rules/condition-editor.test.tsx`
Expected: FAIL, `vocabulary` is not a prop.

- [ ] **Step 3: Implement**

Replace `RANGE_KINDS`, `RANGE_SPECS`, `CONDITION_LABEL` and `ALL_KINDS` with reads off
`props.vocabulary`. `EditorState.active` becomes a set of `ConditionDef['key']`. `seedState` and
`commit` look each key up in the vocabulary instead of in `RANGE_SPECS`. Keep the PvP block, but
render it only when the vocabulary declares a `pvp` condition, so Poracle's vocabulary can opt in
and a vocabulary without PvP does not show an empty radio group.

- [ ] **Step 4: Prove Filters did not change**

Run: `bun test app/rules/condition-editor.test.tsx app/rules/rule-sheet.tsx app/pages/filters-page.test.tsx`
Expected: PASS, every pre-existing test unmodified plus the new one.

- [ ] **Step 5: Gate and commit**

```bash
bun test && bun run lint && bun run typecheck
git add -A
git commit -m "refactor(rules): drive ConditionEditor from a vocabulary

The editor read its condition list from module constants wired to ReactMap's
own columns, so serving Poracle's 15 extra fields would have meant teaching
it a second schema. It now takes a vocabulary and defaults to ReactMap's, so
the Alerts tab can pass Poracle's without either side knowing about the
other.

Pure refactor: every existing editor, sheet and filters-page test passes
unmodified."
```

---

### Task 9: Poracle's vocabulary

**Files:**
- Create: `app/rules/poracle-vocabulary.ts`, `app/rules/poracle-vocabulary.test.ts`

**Interfaces:**
- Consumes: `Vocabulary` (Task 7), `AlertRow` (Task 5).
- Produces: `PORACLE_VOCABULARY: Vocabulary`.

Conditions: IV, CP, level, attack, defence, stamina, gender, size, weight, time remaining, rarity,
and PvP with its league, rank range, minimum CP and level cap. Tail: ping, clean, distance,
template, saved-location anchor.

- [ ] **Step 1: Write the failing test**

```ts
// app/rules/poracle-vocabulary.test.ts
import { expect, test } from 'bun:test'
import { describeWithVocabulary } from './condition-vocabulary'
import { PORACLE_VOCABULARY } from './poracle-vocabulary'

test('an alert reads as a sentence with the delivery tail', () => {
  const row = { ivMin: 100, ivMax: 100, distance: 5000, clean: true }
  const text = describeWithVocabulary(row, PORACLE_VOCABULARY)
  expect(text).toContain('IV 100%')
  expect(text).toContain('within 5 km')
})

test('distance 0 reads as the area subscription, not as zero metres', () => {
  // Poracle treats distance = 0 as "use my areas". Rendering "within 0 km"
  // would be actively wrong.
  expect(describeWithVocabulary({ distance: 0 }, PORACLE_VOCABULARY)).toContain('my areas')
})

test('every Poracle-only field has a definition', () => {
  const keys = new Set(
    [...PORACLE_VOCABULARY.conditions, ...PORACLE_VOCABULARY.tail].flatMap(
      (c: any) => [c.field, c.minField, c.maxField].filter(Boolean),
    ),
  )
  for (const field of [
    'ping', 'clean', 'distance', 'template', 'overrideLocationLabel',
    'weightMin', 'weightMax', 'minTime', 'rarityMin', 'rarityMax',
    'pvpMinCp', 'pvpCap',
  ]) {
    expect(keys.has(field)).toBe(true)
  }
})
```

- [ ] **Step 2: Run it and watch it fail**

Run: `bun test app/rules/poracle-vocabulary.test.ts`
Expected: FAIL, cannot resolve `./poracle-vocabulary`.

- [ ] **Step 3: Implement**

Define `PORACLE_VOCABULARY` against the `AlertRow` field names from Task 5. `distance` is a range
whose renderer special-cases `0` to `'within my areas'` and otherwise prints kilometres.
`minTime` renders as `'at least N seconds left'`. `clean` is a toggle. `ping` and `template` are
text.

- [ ] **Step 4: Gate and commit**

```bash
bun test && bun run lint && bun run typecheck
git add app/rules/poracle-vocabulary.ts app/rules/poracle-vocabulary.test.ts
git commit -m "feat(alerts): define Poracle's condition vocabulary

The 15 fields Poracle has and ReactMap's rule table does not, expressed as a
descriptor the shared editor and renderer already understand. Two of them
need their own rendering rather than a number: distance 0 means 'use my
areas' rather than zero metres, and min_time is a floor on remaining
lifetime."
```

---
### Task 10: The Alerts tab, read side

**Files:**
- Create: `app/alerts/alerts-query.ts`, `app/alerts/alerts-query.test.tsx`, `app/alerts/alert-card.tsx`, `app/alerts/alert-card.test.tsx`
- Modify: `app/pages/alerts-page.tsx`, `app/pages/alerts-page.test.tsx` (create)

**Interfaces:**
- Consumes: `alerts.status` / `alerts.snapshot` (Task 6), `PORACLE_VOCABULARY` (Task 9).
- Produces:
  ```ts
  interface AlertsClient {
    status(): Promise<{ state: 'present' | 'absent' | 'unreachable' | 'unconfigured' }>
    snapshot(): Promise<AlertsSnapshot>
  }
  function useAlerts(options?: { client?: AlertsClient }): {
    state: 'loading' | 'present' | 'absent' | 'unreachable' | 'unconfigured'
    snapshot: AlertsSnapshot | null
  }
  ```

Follow the `RulesClient` seam in `app/rules/rules-query.ts` exactly: a default tRPC-backed client,
overridable for tests.

- [ ] **Step 1: Write the failing test**

```tsx
// app/pages/alerts-page.test.tsx
import { afterAll, afterEach, beforeAll, expect, test } from 'bun:test'
import { QueryClientProvider } from '@tanstack/react-query'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import { createRulesQueryClient } from '../rules/rules-query'
import { setupDom, teardownDom } from '../test-setup'
import { AlertsPage } from './alerts-page'

beforeAll(setupDom)
afterAll(teardownDom)
afterEach(cleanup)

function renderWith(client: any) {
  return render(
    <QueryClientProvider client={createRulesQueryClient()}>
      <AlertsPage alertsClient={client} />
    </QueryClientProvider>,
  )
}

const EMPTY_SNAPSHOT = {
  human: { enabled: true, currentProfileNo: 1, latitude: null, longitude: null, areas: [] },
  alerts: [],
  profiles: [],
  locations: [],
}

test('renders one card per alert, described through Poracle\'s vocabulary', async () => {
  renderWith({
    status: async () => ({ state: 'present' }),
    snapshot: async () => ({
      ...EMPTY_SNAPSHOT,
      alerts: [{ uid: 7, pokemonId: 149, ivMin: 100, ivMax: 100, distance: 5000, clean: true }],
    }),
  })
  await waitFor(() => expect(screen.getByText(/IV 100%/)).toBeTruthy())
  expect(screen.getByText(/within 5 km/)).toBeTruthy()
})

test('an unreachable Poracle says so instead of showing an empty list', async () => {
  // 1.x rendered the full dialog with every button disabled and no
  // explanation. An empty list reads as "you have no alerts", which is a
  // different and wrong claim.
  renderWith({
    status: async () => ({ state: 'unreachable' }),
    snapshot: async () => EMPTY_SNAPSHOT,
  })
  await waitFor(() => expect(screen.getByText(/unavailable|unreachable/i)).toBeTruthy())
})

test('no alerts and a working Poracle says the list is empty, not broken', async () => {
  renderWith({
    status: async () => ({ state: 'present' }),
    snapshot: async () => EMPTY_SNAPSHOT,
  })
  await waitFor(() => expect(screen.getByText(/no alerts yet/i)).toBeTruthy())
})
```

- [ ] **Step 2: Run it and watch it fail**

Run: `bun test app/pages/alerts-page.test.tsx`
Expected: FAIL, `AlertsPage` takes no `alertsClient` prop.

- [ ] **Step 3: Implement `alerts-query.ts` then the page**

`useAlerts` runs `status` first and only fetches `snapshot` when the state is `present`. The page
branches on the state: `present` renders the card list, `unreachable` renders the explanation,
`unconfigured` renders nothing, and `absent` never reaches the page at all because the tab is not
rendered (Task 10 Step 4).

- [ ] **Step 4: Hide the tab entirely when there is no human**

In `app/layout/shell.tsx`, the bottom nav must not render the Alerts entry when the state is
`absent` or `unconfigured`. Read it from the same `useAlerts` hook so there is one source of truth.
Add a test asserting the nav has no Alerts link in the `absent` state.

- [ ] **Step 5: Gate and commit**

```bash
bun test && bun run lint && bun run typecheck
git add -A
git commit -m "feat(alerts): render the Alerts tab

Three states, rendered as three different things. A working Poracle with no
alerts says the list is empty; an unreachable one says so rather than showing
an empty list, because an empty list is a claim about your subscriptions
rather than about the connection; and an account with no Poracle human does
not get the tab at all.

1.x conflated the last two into a dialog with every button disabled and no
explanation."
```

---

### Task 11: The alerts router, write side

**Files:**
- Modify: `server/src/trpc/alerts-router.ts`, `server/src/trpc/alerts-router.test.ts`

**Interfaces:**
- Produces:
  ```ts
  alertsRouter.create // input { rules: AlertInput[] } -> { created: AlertRow[]; updated: AlertRow[]; unchanged: AlertRow[] }
  alertsRouter.replace // input { uid: number; rule: AlertInput } -> { uid: number }  (the NEW uid)
  alertsRouter.remove  // input { uid: number } -> { deleted: number[] }
  ```

`AlertInput` carries the condition and tail fields, a `profileNo`, and **no human id**. `create`
always sends `?silent=true`.

- [ ] **Step 1: Write the failing test**

```ts
test('create suppresses the confirmation push', async () => {
  // Without silent=true a batch notifies the user about the batch they just
  // performed, once per rule.
  let seenPath = ''
  const ctx = {
    ...BASE,
    poracleClient: {
      get: async () => ({ status: 200, body: SNAPSHOT_BODY }),
      send: async (_m: string, path: string) => {
        seenPath = path
        return { status: 200, body: { created: [], updated: [], unchanged: [] } }
      },
    },
  }
  await caller(ctx).create({ rules: [] })
  expect(seenPath).toContain('silent=true')
})

test('replace returns the new uid, because PUT is delete plus insert', async () => {
  const ctx = {
    ...BASE,
    poracleClient: {
      get: async () => ({ status: 200, body: SNAPSHOT_BODY }),
      send: async () => ({ status: 200, body: { updated: [{ uid: 99 }] } }),
    },
  }
  expect(await caller(ctx).replace({ uid: 7, rule: {} as any })).toEqual({ uid: 99 })
})

test('no write procedure accepts a human id', () => {
  for (const name of ['create', 'replace', 'remove']) {
    const def: any = (alertsRouter as any)._def.procedures[name]._def
    const schema = JSON.stringify(def.inputs ?? [])
    expect(schema).not.toContain('humanId')
    expect(schema).not.toContain('platformId')
  }
})

test('a write requires the alerts perm', async () => {
  const ctx = { ...BASE, perms: { alerts: false } }
  await expect(caller(ctx).remove({ uid: 1 })).rejects.toThrow(/not available/)
})

test('a blocked human can read but cannot write', async () => {
  // Task 6 computes pokemonBlocked for `status`. The reads stay available so
  // someone can still see what they are subscribed to; only the writes are
  // refused. A blocked account that could still create rules would make the
  // block decorative.
  const ctx = {
    ...BASE,
    poracleClient: {
      get: async () => ({
        status: 200,
        body: { ...SNAPSHOT_BODY, human: { ...SNAPSHOT_BODY.human, blocked_alerts: '["monster"]' } },
      }),
      send: async () => ({ status: 200, body: {} }),
    },
  }
  await expect(caller(ctx).snapshot()).resolves.toBeDefined()
  for (const call of [
    () => caller(ctx).create({ rules: [] }),
    () => caller(ctx).replace({ uid: 7, rule: {} as any }),
    () => caller(ctx).remove({ uid: 7 }),
  ]) {
    await expect(call()).rejects.toThrow(/blocked/i)
  }
})

test('an operator-disabled category blocks writes for everyone', async () => {
  const ctx = { ...BASE, poracleConfig: { disabledHooks: ['monster'] } }
  await expect(caller(ctx).remove({ uid: 7 })).rejects.toThrow(/blocked/i)
})
```

- [ ] **Step 2: Run it and watch it fail**

Run: `bun test server/src/trpc/alerts-router.test.ts`
Expected: FAIL, `create` is not a procedure.

- [ ] **Step 3: Implement**

Each write calls `requirePerm(ctx, 'alerts')`, resolves the platform id server side, and posts to
`/v2/humans/{encoded}/tracking/pokemon`. `create` appends `?silent=true`. `replace` returns
`body.updated[0].uid`. Every response is mapped through Task 5's helpers, never returned raw.

Validate `profileNo` against the profile list from the snapshot before forwarding it: `resolveHuman`
in Poracle takes `?profile` from the query string without checking the human owns that profile
(spec 7.4).

Every write also refuses when the category is blocked, reusing Task 6's `pokemonBlocked`
computation rather than recomputing it: extract that logic into a shared helper in Task 6 and call
it here. Reads stay available, because someone whose alerts are blocked should still be able to see
what they are subscribed to. Only the writes are refused. This is the plan's "a blocked human
cannot write" criterion, and without it Task 6's `pokemonBlocked` is decorative.

- [ ] **Step 4: Gate and commit**

```bash
bun test && bun run lint && bun run typecheck
git add -A
git commit -m "feat(trpc): add the alerts write procedures

create always sends silent=true, because Poracle's confirmation push would
otherwise notify the user about the batch they just performed.

replace returns the new uid rather than the one it was given. PUT is
documented as delete plus insert, and Poracle's diff-update path does the
same thing, so no write preserves a uid and a client cache keyed on one is
invalidated by its own save.

A requested profile number is checked against the human's own profiles first:
Poracle's resolveHuman takes ?profile from the query string without verifying
ownership."
```

---

### Task 12: Editing an alert

**Files:**
- Create: `app/alerts/alert-editor.tsx`, `app/alerts/alert-editor.test.tsx`
- Modify: `app/pages/alerts-page.tsx`, `app/alerts/alerts-query.ts`

**Interfaces:**
- Consumes: `alerts.create` / `alerts.replace` / `alerts.remove` (Task 11), `ConditionEditor` with `vocabulary` (Task 8), `PORACLE_VOCABULARY` (Task 9).
- Produces: `useAlerts` gains `create`, `replace`, `remove`; `AlertsClient` gains the matching three methods.

- [ ] **Step 1: Write the failing test**

```tsx
test('saving an edit adopts the new uid rather than keeping the old one', async () => {
  // PUT is delete plus insert. A cache keyed on the old uid would point at a
  // row that no longer exists, and the next edit would 404.
  const replaced: any[] = []
  renderWith({
    status: async () => ({ state: 'present' }),
    snapshot: async () => ({ ...EMPTY_SNAPSHOT, alerts: [{ uid: 7, pokemonId: 149, ivMin: 100, ivMax: 100 }] }),
    replace: async (args: any) => {
      replaced.push(args)
      return { uid: 99 }
    },
  })
  await waitFor(() => expect(screen.getByText(/IV 100%/)).toBeTruthy())
  fireEvent.click(screen.getByText(/IV 100%/))
  fireEvent.click(await screen.findByRole('button', { name: /save/i }))
  await waitFor(() => expect(replaced[0].uid).toBe(7))
  await waitFor(() => expect(screen.queryByTestId('alert-7')).toBeNull())
  expect(screen.getByTestId('alert-99')).toBeTruthy()
})

test('deleting removes the card', async () => {
  renderWith({
    status: async () => ({ state: 'present' }),
    snapshot: async () => ({ ...EMPTY_SNAPSHOT, alerts: [{ uid: 7, pokemonId: 149 }] }),
    remove: async () => ({ deleted: [7] }),
  })
  await waitFor(() => expect(screen.getByTestId('alert-7')).toBeTruthy())
  fireEvent.click(screen.getByRole('button', { name: /delete/i }))
  await waitFor(() => expect(screen.queryByTestId('alert-7')).toBeNull())
})
```

- [ ] **Step 2: Run it and watch it fail**

Run: `bun test app/alerts/alert-editor.test.tsx`
Expected: FAIL, cannot resolve `./alert-editor`.

- [ ] **Step 3: Implement**

`AlertEditor` is the Filters sheet with `vocabulary={PORACLE_VOCABULARY}`. On save it calls
`replace` for an existing uid or `create` for a new alert, then reconciles the cache from the
returned uid rather than assuming the edited row survived.

- [ ] **Step 4: Gate and commit**

```bash
bun test && bun run lint && bun run typecheck
git add -A
git commit -m "feat(alerts): edit, create and delete an alert

The sheet is the Filters sheet with Poracle's vocabulary passed in, which is
what the descriptor refactor was for.

Saving reconciles from the uid the write returns instead of the one it sent.
No Poracle write path preserves a uid: PUT is delete plus insert, and the
diff-update path calls DeleteByUIDs then Insert, so a cache keyed on the old
value would point at a row that no longer exists and the next edit would
404."
```

---

### Task 13: The human panel, profiles and the master switch

**Files:**
- Create: `app/alerts/human-panel.tsx`, `app/alerts/human-panel.test.tsx`
- Modify: `server/src/trpc/alerts-router.ts`, `app/alerts/alerts-query.ts`, `app/pages/alerts-page.tsx`

**Interfaces:**
- Produces:
  ```ts
  alertsRouter.setEnabled   // input { enabled: boolean } -> { enabled: boolean }
  alertsRouter.switchProfile // input { profileNo: number } -> { currentProfileNo: number }
  alertsRouter.addProfile    // input { name: string } -> { profileNo: number }
  alertsRouter.renameProfile // input { profileNo: number; name: string } -> { profileNo: number }
  alertsRouter.deleteProfile // input { profileNo: number } -> { deleted: number }
  alertsRouter.copyProfile   // input { profileNo: number } -> { profileNo: number }
  ```

- [ ] **Step 1: Write the failing test**

```tsx
test('the master switch reflects and toggles the human enabled flag', async () => {
  const calls: boolean[] = []
  renderPanel({
    snapshot: { ...EMPTY_SNAPSHOT, human: { ...EMPTY_SNAPSHOT.human, enabled: true } },
    setEnabled: async ({ enabled }: any) => {
      calls.push(enabled)
      return { enabled }
    },
  })
  fireEvent.click(screen.getByRole('switch', { name: /alerts/i }))
  await waitFor(() => expect(calls).toEqual([false]))
})

test('switching profile refetches, because rules are scoped to one profile', async () => {
  // The per-type list defaults to the human's active profile, so the rule
  // list is wrong until it is refetched.
  let snapshots = 0
  renderPanel({
    snapshot: () => { snapshots += 1; return EMPTY_SNAPSHOT },
    switchProfile: async () => ({ currentProfileNo: 2 }),
    profiles: [{ profileNo: 1, name: 'default' }, { profileNo: 2, name: 'work' }],
  })
  const before = snapshots
  fireEvent.click(screen.getByRole('option', { name: 'work' }))
  await waitFor(() => expect(snapshots).toBeGreaterThan(before))
})
```

And in `server/src/trpc/alerts-router.test.ts`, beside the other router tests:

```ts
test('a profile number the human does not own is rejected before forwarding', async () => {
  // Poracle's resolveHuman takes ?profile from the query string without
  // checking ownership, so this check has to happen here.
  await expect(caller(BASE).switchProfile({ profileNo: 99 })).rejects.toThrow(/profile/i)
})
```

- [ ] **Step 2: Run it and watch it fail**

Run: `bun test app/alerts/human-panel.test.tsx`
Expected: FAIL, cannot resolve `./human-panel`.

- [ ] **Step 3: Implement**

Procedures map onto `POST /v2/humans/{id}/enable` and `/disable`, `POST .../profile` to switch, and
the four `/profiles` operations. Each validates `profileNo` against the human's own profiles first.
The panel invalidates the snapshot query after a profile switch.

- [ ] **Step 4: Gate and commit**

```bash
bun test && bun run lint && bun run typecheck
git add -A
git commit -m "feat(alerts): manage profiles and the master switch

profile_no is a column on every monster row and the per-type list defaults to
the human's active profile, so without a profile switcher the tab silently
shows one slice of someone's alerts and calls it the list.

Every procedure taking a profile number checks it against the human's own
profiles first. Poracle's resolveHuman accepts ?profile from the query string
without verifying ownership."
```

---

### Task 14: The human panel, areas and saved locations

**Files:**
- Modify: `app/alerts/human-panel.tsx`, `app/alerts/human-panel.test.tsx`, `server/src/trpc/alerts-router.ts`

**Interfaces:**
- Produces:
  ```ts
  alertsRouter.setAreas    // input { areas: string[] } -> { areas: string[] }
  alertsRouter.addLocation // input { label: string; latitude: number; longitude: number } -> LocationView
  alertsRouter.updateLocation // input { label: string; latitude: number; longitude: number } -> LocationView
  alertsRouter.deleteLocation // input { label: string } -> { deleted: string }
  ```

- [ ] **Step 1: Write the failing test**

```ts
test('areasToSkip are not offered', async () => {
  // Config-level suppression. 1.x normalised these to lowercase at boot and
  // compared case-insensitively; matching case-sensitively would silently
  // offer an area the operator hid.
  const ctx = { ...BASE, poracleConfig: { areasToSkip: ['Downtown'] } }
  const res = await caller(ctx).snapshot()
  expect(res.human.areas).not.toContain('downtown')
})

test('deleting a saved location an alert anchors to is refused', async () => {
  // resolveOverride falls back to the person's default position when a label
  // points at a location that no longer exists, silently and without error.
  // So the alert keeps working and quietly measures from the wrong place.
  const ctx = {
    ...BASE,
    poracleClient: {
      get: async () => ({
        status: 200,
        body: {
          ...SNAPSHOT_BODY,
          tracking: { pokemon: [{ uid: 1, override_location_label: 'work' }] },
          locations: { locations: [{ label: 'work', latitude: 1, longitude: 2 }] },
        },
      }),
      send: async () => ({ status: 200, body: {} }),
    },
  }
  await expect(caller(ctx).deleteLocation({ label: 'work' })).rejects.toThrow(/in use/i)
})

test('a location not in use deletes normally', async () => {
  const ctx = { ...BASE, poracleClient: { get: async () => ({ status: 200, body: SNAPSHOT_BODY }), send: async () => ({ status: 200, body: {} }) } }
  expect(await caller(ctx).deleteLocation({ label: 'unused' })).toEqual({ deleted: 'unused' })
})
```

- [ ] **Step 2: Run it and watch it fail**

Run: `bun test server/src/trpc/alerts-router.test.ts`
Expected: FAIL, `deleteLocation` is not a procedure.

- [ ] **Step 3: Implement**

`setAreas` filters `config.poracle.areasToSkip`, compared lowercase on both sides.
`deleteLocation` reads the snapshot first and refuses when any alert's `overrideLocationLabel`
matches, because Poracle's `resolveOverride` (`matching/generic.go:146`) falls back to the person's
default position without an error when a label no longer resolves.

- [ ] **Step 4: Gate and commit**

```bash
bun test && bun run lint && bun run typecheck
git add -A
git commit -m "feat(alerts): manage areas and saved locations

distance = 0 means 'use my areas', so the area list is what those alerts
actually fire against, and override_location_label points into the saved
locations table.

Deleting a location an alert still anchors to is refused. Poracle's
resolveOverride falls back to the person's default position when a label no
longer resolves, silently and without an error, so the alert would keep
working and quietly measure from the wrong place.

areasToSkip is compared lowercase on both sides, matching how 1.x normalised
it at boot."
```

---

## Done when

- `bun test`, `bun run lint`, `bun run typecheck` all green, test count above 760.
- A Discord account resolves `perms.alerts` and can open the tab.
- No procedure accepts a Poracle human id, asserted structurally.
- No Poracle response reaches a client unmodified.
- The secret appears in no output, log, or error body.
- The three human states render as three different things, and `absent` has no tab.
- A human blocked from monster alerts, or an operator-disabled category, cannot write.
- `describe-rule.test.ts`, `condition-editor.test.tsx` and `filters-page.test.tsx` pass unmodified,
  proving the vocabulary refactor changed no Filters behaviour.

## Next

Plan 9 is push and pull: the six new `rule` columns (`weight_min`, `weight_max`, `costume`,
`min_time_seconds`, `pvp_min_cp`, `pvp_cap`), the transfer list dialog, resemblance computed
against Poracle's `diff` tags, and the import report. It depends on this plan's vocabulary
descriptor and transport.
