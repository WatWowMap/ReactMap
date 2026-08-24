# 2.0 Server Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stand up the 2.0 server on Bun.serve, serving only what the 2.0 client needs, with no Express, no Apollo, no passport, and no calls into 1.x code.

**Architecture:** A new entry point is built alongside the existing one and takes over only when it works. `Bun.serve` owns the port; Better Auth is mounted natively as `auth.handler(request)`. The surviving auth work from the previous plans carries over, minus every place it reached into 1.x. The back-fill stops being a boot-time knex migration and becomes a script an operator runs.

**Tech Stack:** Bun, Better Auth 1.7.1, Drizzle ORM, Knex (schema migrations only), `bun test`.

## The measured fact this plan is sized against

The 2.0 client calls exactly one server route today: `/api/settings`. Everything else the current Express app serves belongs to the 1.0 client or to the admin API. So the surface this server must answer is small:

```
/api/auth/*     Better Auth
/api/settings   client bootstrap
/api/health     liveness
static          app.html and its assets
```

That is the whole thing. Resist growing it. Anything a 1.0 route did that 2.0 has not asked for yet does not belong here.

## Acceptance criteria

These are the merge gate. Write them first, watch them fail, and treat them as the definition of done. Every previous plan in this project verified the artifact each task produced rather than the outcome it existed for, and that is how three Criticals were reported as closed while still broken.

1. A user created through Better Auth can sign in and receives a session cookie.
2. That cookie, presented to `/api/settings`, yields a response identifying them as logged in with their permissions attached.
3. A user with no session gets an anonymous `/api/settings` response, not an error.
4. A user whose Discord account is in a blocked guild cannot obtain a session.
5. A user whose permissions are revoked stops seeing those permissions on the next request.
6. A user migrated from a 1.x table by the migration script can sign in with their existing password.
7. Auth responses complete. Every response has a `time_total` far below any client timeout, checked explicitly, because a response that returns a status and then holds the connection open has already shipped once in this project.

## Global Constraints

- Target branch is `v2`.
- Runtime is Bun. Every command is `bun`, never `npm` or `node`.
- Tests are `bun test`, currently passing 351.
- Lint is Biome: `bun run lint`. Never ESLint or Prettier.
- **No code on this branch may import, call, or adapt anything under `server/src/services/DiscordClient.js`, `TelegramClient.js`, `server/src/graphql/`, or `server/src/models/`.** Read them to learn what 1.x did, then write the 2.0 behaviour fresh. This is the rule the whole plan exists to enforce.
- The 1.0 client in `src/` stays in the repo and is served by nothing here.
- Knex still owns schema DDL. The data back-fill stops being a migration.
- Never write the user's name into code, comments, or documentation.
- Commit messages: conventional style, wrapped at 72 columns, ending with the `Co-Authored-By` trailer used on this branch.

---

## Task 1: Acceptance suite, failing

Write the seven criteria above as an executable suite before anything else changes. It drives a real server over HTTP and asserts outcomes, not internals. It should be almost entirely red at the end of this task, and every later task is judged by which lines of it turn green.

Put it somewhere it will not be confused with unit tests, and give it an explicit client timeout on every request so a hang is a failure rather than a stall.

## Task 2: Bun.serve entry, static and health

A new entry alongside the existing one, not replacing it yet. `Bun.serve` serving `app.html` and its assets, plus `/api/health`. Nothing else. The old Express entry stays untouched and still runs.

Verify by starting it on a second port and fetching both, then confirming the old server still starts unaffected.

## Task 3: Better Auth, mounted natively

`auth.handler(request)` on the new entry. No `toNodeHandler`, no middleware, no body parser ahead of it. Carry over `server/src/auth/index.js` and its hooks; delete the Express-only pieces as you go rather than leaving them for later.

This closes several defects by construction rather than by fixing them: there is no `res.write` to wrap, so the logger backpressure class cannot exist; there is no middleware ordering, so the mount-ordering class cannot exist.

Acceptance 1 and 7 must go green here.

## Task 4: Permissions, written fresh

The sign-in gate and the permission recompute currently call 1.x's `DiscordClient` with a hardcoded empty guild list, which makes every guild-derived permission false. Do not fix that by wiring the old client in. Write the 2.0 version.

Read `DiscordClient.getPerms` and `TelegramClient.getUserPerms` to learn the rules: which config keys matter, how `allowedGuilds`, `blockedGuilds`, `allowedUsers` and role mappings combine, and what shape the result takes. Then write a 2.0 implementation that fetches the user's guilds from Discord with the OAuth token Better Auth already stores on the account row, and computes permissions from config.

Local permissions need writing too. 1.x had a `LocalClient` that granted permissions by role; it was deleted, and nothing replaced it, so credential users currently get none at all.

Acceptance 4 and 5 depend on this.

## Task 5: `/api/settings`, ported

The one route the 2.0 client calls. Read what the Express version returns and reimplement it as a native handler that builds its own context from `auth.api.getSession({ headers })`. It must not reconstruct `req.user`; there is no Express request to attach it to. The client should be given exactly what it needs and nothing shaped like passport.

Acceptance 2 and 3 must go green here.

## Task 6: Migration as a script

The back-fill currently runs inside `migrate:latest`, which means a collision in a real user table takes the whole instance offline, because migrations run before the server listens. Extract it to a script an operator invokes deliberately, with output they can read and act on.

Keep the collision detection, and fix the predicate while you are there: it currently compares usernames with JavaScript `toLowerCase()` while MySQL enforces uniqueness under `utf8mb4_unicode_ci`, which also folds accents and sharp-s, so colliding pairs slip past and `INSERT IGNORE` drops one silently. Match the collation, or do the comparison in the database.

Acceptance 6 depends on this.

## Task 7: Cutover and removal

Make the new entry the one `bun .` starts. Then remove from this branch: the Express bootstrap, `@apollo/server` and the GraphQL server, `express`, `compression`, `cors`, `body-parser`, `helmet` if the new entry sets its own headers, and every Express-only file the previous plans produced. `server/src/middleware/authSession.js` goes; it existed to make Better Auth look like passport to GraphQL resolvers that no longer run here.

The 1.0 client's `@apollo/client` dependency stays, because `src/` still builds.

Run the full acceptance suite. All seven must pass.

## What this deliberately does not do

- No tRPC yet. The 2.0 client calls one route; a 60-procedure surface is its own plan, and it belongs with the client work that needs it.
- No 1.0 routes. `/api/v1`, `/area/*` and the legacy `/auth/*` paths are not ported. If something turns out to need them, that is a decision to make deliberately, not by porting ahead of demand.
- No `useAppShell` unpicking. It and the two-entry build were made for coexistence inside one deployment. They are harmless and may be wanted for a staged rollout after merge.
