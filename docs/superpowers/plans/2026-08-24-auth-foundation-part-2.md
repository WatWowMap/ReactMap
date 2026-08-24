# Auth Foundation, Part 2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restore the authorization layer that came out with passport, and make the back-fill safe to run against a real user table.

**Architecture:** Part 1 replaced authentication and left authorization behind. The strategies in `server/src/strategies/` were the only callers of `DiscordClient.authHandler` and `TelegramClient.authHandler`, which compute a user's permissions from guild membership, and they enforced `blockedGuilds` and `allowedUsers` while passport's `deserializeUser` carried the final `perms.map` gate. This plan gives that code a caller again, through Better Auth's sign-in hooks, and gives revocation somewhere real to write.

**Tech Stack:** Bun, Better Auth 1.7.1, Drizzle ORM, Knex (migrations only), Express 5, `bun test`.

## Why this exists

A whole-branch review of Part 1 returned twelve Critical findings across three independent lenses. Every file did what it said; the suite was green at 260, lint and typecheck were clean, and the server booted. The findings were not in any line of code. They were a missing layer.

That is worth stating plainly, because it shapes how this plan should be executed: per-task review cannot catch this class of defect, since each task was individually correct. Only running the system and asking "who does X now" surfaced it. Every task below therefore ends with an executed check, not an assertion.

## Global Constraints

- Target branch is `v2`. Part 1 is commits `fa48d99c..23730419` on this branch.
- Runtime is Bun. Every command is `bun`, never `npm` or `node`.
- Tests are `bun test`. Server tests live in `server/test/*.test.js`. The suite passes 260 at the start of this plan.
- Lint is Biome: `bun run lint`. Never ESLint or Prettier.
- Server code is CommonJS (`require`). Do not convert anything to ESM.
- Knex owns all DDL. Do not add drizzle-kit.
- The legacy `users` table is read but never modified or dropped.
- The knex CLI does not read `.env`. Prefix migration commands with `set -a; . ./.env; set +a`.
- Never write the user's name into code, comments, or documentation.
- Commit messages: conventional style, wrapped at 72 columns, ending with the `Co-Authored-By` trailer used on this branch.

## Ordering, and why it matters

Task 1 comes first and is not negotiable. `legacy_id` must exist on `auth_user` before any real deployment runs the back-fill, because afterwards the mapping between an auth user and its legacy row is unrecoverable except by re-deriving hashes. Everything else can follow in any order.

Tasks 2 through 4 restore authorization and are the reason this plan exists. Tasks 5 onward are bounded correctness fixes that happen to have been found by the same review.

---

## Task 1: Add legacy_id to auth_user

**The defect.** `planBackfill` computes `legacyId` (`server/src/auth/backfill.js:48`) and the migration discards it. There is no join key from an auth user back to `users`, `backups`, `gymBadges` or `nest_submissions`. Worse than absent: `req.user.id` is a 36-character hex string and `users.id` is a bigint, so MySQL coerces rather than failing and returns a different person's row for roughly half the id space. `rootRouter.js:182` and `resolvers.js:852` then write to that stranger's legacy row.

**Files:** amend `server/src/db/migrations/*_add_better_auth_tables.cjs`, `server/src/db/authSchema.js`, `server/src/db/migrations/*_backfill_auth_users.cjs`, `server/test/authSchema.test.js`, `server/test/authBackfill.test.js`.

Amending the Part 1 migrations in place is correct here for the same reason it was in Part 1: the branch is unmerged and no deployment has run them. Once it has, this becomes a follow-up migration instead.

**Steps:** add `legacy_id BIGINT NULL` with an index to the `auth_user` DDL and the Drizzle table; write `legacy_id: user.legacyId` in the back-fill insert; assert in tests that a back-filled row carries it. Then verify by running the back-fill over a fixture and joining `auth_user` to `users` on it, confirming a round trip.

## Task 2: Give perms computation a caller again

**The defect.** Nothing writes `user_perms` after the one-shot migration, confirmed by grep: the only writer in the codebase is the back-fill. So permissions are a snapshot taken at migration time, new registrations get `{}` forever, and `DiscordClient.authHandler` and `TelegramClient.authHandler` have zero callers.

**Approach.** Better Auth exposes `databaseHooks.session.create.before/after`. That is the structural replacement for passport's `deserializeUser`: it runs on every sign-in, has the user in hand, and can write. On session creation, resolve the user's linked `auth_account` rows, call the matching client's `authHandler` for each, and upsert the result into `user_perms`.

**Assumption being made here, flagged rather than hidden:** perms are recomputed at sign-in rather than on every request. That matches 1.x, where perms were computed at login and refreshed by Discord gateway events, and it keeps the request path free of a guild lookup. Task 3 restores the event-driven half.

## Task 3: Make revocation write somewhere real

**The defect.** `DiscordClient` still calls `Session.clearDiscordSessions` and `User.clearPerms` on `guildMemberRemove` and `guildMemberUpdate`, and `Trial` calls the equivalents on expiry. All of them target the legacy `session` and `users` tables. On a migrated instance they delete zero rows and null a column nothing reads, while returning success. Someone kicked from the guild keeps their permissions permanently.

**Approach.** Point those paths at `user_perms` and `auth_session`. Better Auth exposes session revocation through its API; `auth_session` can also be queried by `user_id` directly, which is simpler than the JSON-path queries these methods use today. This supersedes the separately spawned task about retiring `server/src/models/Session.js`.

## Task 4: Restore the login-time authorization gate

**The defect.** `blockedGuilds`, `allowedUsers`, and the `perms.map` check that passport's `deserializeUser` enforced are all in code with no callers. On an instance that restricted login to one Discord guild, any Discord account can now obtain a session. Separately, the configured `authentication.strategies[].redirectUri` is ignored and the `guilds` scope is no longer requested, which is the basis of the whole permission model.

**Approach.** Request `guilds` and honour `redirectUri` in the Discord provider config. Enforce the gate in the same `session.create.before` hook Task 2 adds, rejecting rather than creating a session.

## Task 5: Wire auth through localPassword

**The defect.** `server/src/services/localPassword.js` is a hardened bcrypt wrapper with more than twenty tests covering bcrypt's 72-byte truncation, a hazard that has already caused a security incident in this codebase. It has no callers. Part 1 handed Better Auth raw `Bun.password` instead, so a legacy password longer than 72 bytes locks its owner out and a malformed hash returns a 500.

## Task 6: Fix mergePerms for array-valued perms

**The defect.** `mergePerms` folds with `merged[key] || value`. An empty array is truthy in JS, so the first row wins outright, and `areaRestrictions` treats empty as unrestricted (`server/src/utils/getAreaSql.js:23`). A user restricted to one area by one provider gets the whole map whenever MySQL returns the other row first, and the query has no `ORDER BY`. The 1.x implementation at `server/src/utils/mergePerms.js:22` unioned arrays explicitly.

## Task 7: Reconcile trust proxy across both layers

**The defect.** `input.trustProxy ? {} : { ipAddressHeaders: [] }` collapses `true`, a hop count, and an IP or CIDR allowlist into one branch. For every address-based value, Express refuses the forged header and Better Auth accepts it, which is exactly the configuration a careful operator chooses. `@better-auth/core` supports `advanced.ipAddress.trustedProxies` for the address case; the named presets cannot be expressed and must fall back to suppressing headers. Also: with the shipped default, `ip_address` is recorded as an empty string for every session, so the audit column is blank rather than carrying the socket address.

## Task 8: Refuse an empty Telegram bot token

**The defect.** `config/default.json` ships `botToken: ""` and `getAuth()` installs the Telegram plugin on `enabled` alone. An empty token makes the HMAC key `sha256("")`, a publicly computable constant, so a self-signed payload impersonates any Telegram-linked user. One guard closes it, and it should throw at construction rather than fail at request time.

## Task 9: Bounded hardening

Each is small and independent:

- Mount the Better Auth handler after `helmetMiddleware` and `loggerMiddleware`. Today the endpoints that issue session cookies are the only ones with no security headers and no access log entry, which must not survive contact with the mount-ordering constraint from Part 1 Task 7. Verify body parsing still works afterwards.
- Wire `api.cookieAgeDays` to `session.expiresIn`; it is currently dead config and Better Auth's 7-day default governs.
- Restore the `api.maxSessions` cap, which lost its only caller.
- Scope the back-fill's `down()` to the rows it wrote rather than emptying the auth tables wholesale, which today destroys every account created after the migration.
- Decide and document whether `is-username-available` should stay reachable unauthenticated, given it makes the user roster enumerable.
- Replace the hardcoded `api.sessionSecret`, which is under Better Auth's 32-character minimum and now protects more than it did.
- Extend typecheck to the new server code. `tsconfig.app.json` covers only `app/**`, so every `// @ts-check` pragma on the auth files is decorative.

## Task 10: Make the back-fill safe against real data

**The defect.** The legacy `users` table has no unique index on `username`, `discordId` or `telegramId`. `auth_user.username` is UNIQUE under a case-insensitive collation, so two rows differing only by case collapse into one account or abort `migrate:latest` entirely, which also blocks boot because `migrate()` runs before `listen`. Two rows sharing a `discordId` reassign the account to whichever was processed last, locking the earlier person out.

**Approach.** Detect collisions before writing and fail loudly with a report naming the conflicting rows, rather than merging or aborting mid-way. An operator can then resolve duplicates deliberately. Also decide what a second run should do about a password the user has changed since migrating, since `merge()` currently resets it to the legacy hash.

## What Part 1 got right

Recorded so a re-reader does not re-litigate it. The Telegram HMAC comparison is constant time and correctly length-guarded. Sign-up is genuinely gated on the local strategy. `/link-social` and `/list-accounts` are 401 without a session. Implicit account linking is blocked because back-filled users carry `email_verified = 0`. The back-fill's issuer strings match what `resolveOAuthAccountKey` derives. Knex wraps each migration in a transaction, so a mid-loop failure rolls back cleanly and leaves the migration unrecorded. Two full forward and rollback cycles left the legacy `users` table byte-identical by sha256.
