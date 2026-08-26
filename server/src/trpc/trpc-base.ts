// server/src/trpc/trpc-base.ts
//
// The one `initTRPC` call, and the context it is typed against. It lives
// apart from `router.ts` so that a sub-router (`rules-router.ts`) can build
// procedures without importing the root router that merges it -- which
// would be a cycle.

import type { Poracle } from '@rm/types'
import { initTRPC } from '@trpc/server'

import type { PoracleClient } from '../services/poracle-client'

interface Context {
  user: any
  session: any
  // The merged `user_perms` rows for this account, loaded per request by
  // `context.ts` and read by `require-perm.ts`. `null` means anonymous --
  // distinct from `{}`, which means a real account holding no grants.
  // Every optional field below spells `| undefined` out: with
  // `exactOptionalPropertyTypes`, the context a procedure receives widens each
  // one, and a helper taking `Context` would otherwise reject the very object
  // tRPC just handed it.
  perms?: Record<string, any> | null | undefined
  golbatClient: any
  // Poracle, when there is one: `null` means the deployment has none, and an
  // absent field means the caller built a context that predates Alerts.
  poracleClient?: PoracleClient | null | undefined
  // The Poracle human id -- the linked Discord account id, resolved from the
  // session. Absent means "not looked up yet", so `alerts-router.ts` resolves
  // it lazily rather than every request paying for the query.
  platformId?: string | null | undefined
  // `config.poracle`, read once per process. The router reads `disabledHooks`
  // off it and never reaches for the config itself, so a test can hand in its
  // own without `mock.module` stealing the real one process-wide.
  // `Partial` because a caller may hand in only the keys a procedure reads;
  // the real shape otherwise, so a typo in a key name is a type error.
  poracleConfig?: Partial<Poracle> | null | undefined
  // Supplied by a caller that has its own database client -- a test does.
  // Procedures fall back to the shared pooled client when it is absent.
  db?: any
  registry?:
    | {
        register: (entry: {
          category: 'pokemon' | 'gym'
          state: any
        }) => () => void
      }
    | undefined
}

const t = initTRPC.context<Context>().create()

export type { Context }
export { t }
