// server/src/trpc/require-perm.ts
//
// The one place a tRPC procedure turns a context into an authorized user id.

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
 *
 * Anonymous is UNAUTHORIZED and signed-in-without-the-grant is FORBIDDEN,
 * because they are different answers: one means "sign in", the other means
 * signing in will not help.
 */
function requirePerm(ctx: Context, perm: string): string {
  const userId = ctx.user?.id ?? ctx.session?.userId
  if (!userId) {
    throw new TRPCError({
      code: 'UNAUTHORIZED',
      message: 'Sign in to use this',
    })
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
