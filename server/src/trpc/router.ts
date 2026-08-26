// server/src/trpc/router.ts
//
// The tRPC v11 router mounted at `/api/trpc` (server/src/serve.js) via
// `fetchRequestHandler`. Task 5's scope is the transport itself, not the
// ~60-procedure RPC surface the transport spec describes (that is future
// work) -- `health` exists only to prove the mount is real and answers a
// request, the way `/api/health` already does for plain HTTP.
//
// `map.subscribe` is the one procedure this task actually needs: a
// subscription resolver returning an async generator, exactly as tRPC v11
// requires (`.subscription()` only accepts `AsyncIterable`; the observable
// form is deprecated -- verified against the installed
// @trpc/server@11.18.0 type definitions, not the docs). It wraps
// `map-subscription.js`'s `subscribeCategory` rather than reimplementing
// it, so this procedure and the WebSocket bridge
// (`server/src/ws/socket-server.js`) are provably the same poll loop.
//
// This procedure is not what the WebSocket bridge actually calls, though --
// see the Task 5 report for why the installed tRPC has no WebSocket
// transport compatible with `Bun.serve`'s native upgrade, and why the
// acceptance suite's wire contract is a different message shape than
// tRPC's own subscription protocol besides. It is kept here, real and
// exercised by its own unit test, because it is still the type-safe
// surface a browser tRPC client (or a future Node-hosted consumer that CAN
// use `@trpc/server/adapters/ws`) would subscribe through.

import { z } from 'zod'

import { getDrizzle } from '../db/drizzle'
import {
  createSubscriptionState,
  pollIntervalForCategory,
  subscribeCategory,
} from '../services/map-subscription'
import { createRulesSource } from '../services/rules-source'
import { alertsRouter } from './alerts-router'
import { masterfileRouter, rulesRouter } from './rules-router'
import { t } from './trpc-base'

const viewportSchema = z.object({
  min: z.object({ lat: z.number(), lon: z.number() }),
  max: z.object({ lat: z.number(), lon: z.number() }),
})

// No `filters`: what a subscription shows comes from the caller's own rules
// (`services/rules-source.ts`), not from anything on the wire. The same
// contract `ws/socket-server.ts` documents at its own header.
const subscribeInputSchema = z.object({
  category: z.enum(['pokemon', 'gym']),
  viewport: viewportSchema,
})

const mapRouter = t.router({
  subscribe: t.procedure
    .input(subscribeInputSchema)
    .subscription(async function* ({ input, ctx, signal }) {
      const state = createSubscriptionState(input)
      // `signal` is `undefined` for a caller outside a real request (e.g. a
      // direct `createCaller` invocation in a test); a generator needs a
      // real signal to await on, so an un-aborted fallback stands in.
      const abortSignal = signal ?? new AbortController().signal
      // Same registration the WebSocket bridge does
      // (`server/src/ws/socket-server.ts`), so a tRPC consumer receives
      // Task 6's pushed fort changes rather than only poll results. The
      // `finally` is what keeps the registry from outliving the
      // subscription, however the generator ends.
      const unregister =
        ctx.registry?.register({ category: input.category, state }) ??
        (() => {})
      const rulesSource = createRulesSource({
        userId: ctx.user?.id,
        getDb: () => ctx.db ?? getDrizzle(),
      })
      try {
        yield* subscribeCategory({
          golbatClient: ctx.golbatClient,
          state,
          signal: abortSignal,
          pollIntervalMs: pollIntervalForCategory(input.category),
          ...(rulesSource ? { rulesSource } : {}),
        })
      } finally {
        unregister()
      }
    }),
})

const appRouter = t.router({
  health: t.procedure.query(() => ({ ok: true })),
  map: mapRouter,
  rules: rulesRouter,
  alerts: alertsRouter,
  masterfile: masterfileRouter,
})

export { appRouter, t }
