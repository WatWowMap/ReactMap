// server/src/trpc/trpc-base.ts
//
// The one `initTRPC` call, and the context it is typed against. It lives
// apart from `router.ts` so that a sub-router (`rules-router.ts`) can build
// procedures without importing the root router that merges it -- which
// would be a cycle.

import { initTRPC } from '@trpc/server'

interface Context {
  user: any
  session: any
  golbatClient: any
  // Supplied by a caller that has its own database client -- a test does.
  // Procedures fall back to the shared pooled client when it is absent.
  db?: any
  registry?: {
    register: (entry: { category: 'pokemon' | 'gym'; state: any }) => () => void
  }
}

const t = initTRPC.context<Context>().create()

export type { Context }
export { t }
