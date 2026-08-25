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

import { initTRPC } from '@trpc/server'
import { z } from 'zod'

import {
  createSubscriptionState,
  pollIntervalForCategory,
  subscribeCategory,
} from '../services/map-subscription'

interface Context {
  user: any
  session: any
  golbatClient: any
}

const t = initTRPC.context<Context>().create()

const viewportSchema = z.object({
  min: z.object({ lat: z.number(), lon: z.number() }),
  max: z.object({ lat: z.number(), lon: z.number() }),
})

const subscribeInputSchema = z.object({
  category: z.enum(['pokemon', 'gym']),
  viewport: viewportSchema,
  filters: z.array(z.record(z.string(), z.any())).default([]),
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
      yield* subscribeCategory({
        golbatClient: ctx.golbatClient,
        state,
        signal: abortSignal,
        pollIntervalMs: pollIntervalForCategory(input.category),
      })
    }),
})

const appRouter = t.router({
  health: t.procedure.query(() => ({ ok: true })),
  map: mapRouter,
})

export { appRouter, t }
