# Auth Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace passport and express-session with Better Auth, backed by Drizzle over the existing ReactMap MySQL database, without changing anything a user can see.

**Architecture:** Better Auth mounts under the existing Express app through `toNodeHandler`, so Express, Apollo and GraphQL all keep working. Knex keeps owning DDL; Drizzle is added only as the typed query surface Better Auth's adapter needs. New tables are `auth_` prefixed and the existing `users` and `session` tables are never written to, so every step is reversible by dropping the new tables.

**Tech Stack:** Bun, Better Auth, Drizzle ORM (mysql2), Knex (migrations only), Express 5, `bun test`.

## Global Constraints

- Target branch is `v2`. Prior plans 1 through 4 are merged.
- Runtime is Bun. Every command is `bun`, never `npm` or `node`.
- Tests are `bun test`. Server tests live in `server/test/*.test.js`.
- Lint and format are Biome: `bun run lint`, `bun run format`. Never ESLint or Prettier.
- Typecheck is `bun run typecheck` (`tsc -p tsconfig.app.json --noEmit`).
- New tables are `auth_user`, `auth_session`, `auth_account`, `auth_verification`, `user_perms`. The existing `users` (`database.settings.userTableName`) and `session` (`database.settings.sessionTableName`) tables are read but never modified or dropped by this plan.
- Knex owns all DDL. Do not add drizzle-kit and do not create a second migration system.
- Migrations are created with `bun run migrate:make <name>` and live in `server/src/db/migrations/` as `.cjs`.
- Passport and express-session stay running until Task 9. Every task before it must leave the app bootable with the old auth intact.
- `server/src/index.js` is CommonJS (`require`). Match it in server code; do not convert files to ESM in this plan.
- Never write the user's name into code, comments, commit messages, or documentation.
- Commit messages are conventional style, wrapped at 72 columns, and end with the `Co-Authored-By` trailer already used on this branch.

---

## File Structure

**Created:**
- `server/src/db/reactMapDb.js`: resolves which configured schema is the ReactMap database. Pure, no I/O.
- `server/src/db/drizzle.js`: a lazily built Drizzle client over that schema's connection.
- `server/src/db/authSchema.js`: Drizzle table definitions matching the Knex-created auth tables.
- `server/src/auth/index.js`: the Better Auth instance.
- `server/src/auth/telegram.js`: Telegram login-widget verification plugin.
- `server/src/auth/backfill.js`: one-way fan-out of `users` rows into the auth tables.
- `server/src/middleware/authSession.js`: populates `req.user` and `req.session.perms` from Better Auth.
- Migrations under `server/src/db/migrations/`, named by `migrate:make`.
- Tests under `server/test/`.

**Modified:**
- `server/src/index.js`: mount Better Auth, set `trust proxy`, drop passport at the end.
- `package.json`: dependencies.

**Deleted (Task 9 only):**
- `server/src/middleware/passport.js`, `server/src/middleware/session.js`, `server/src/strategies/`.

---

### Task 1: Resolve the ReactMap database and build a Drizzle client

**Files:**
- Create: `server/src/db/reactMapDb.js`
- Create: `server/src/db/drizzle.js`
- Test: `server/test/reactMapDb.test.js`

**Interfaces:**
- Consumes: nothing from earlier tasks.
- Produces: `resolveReactMapSchema(schemas): object | null` and `getDrizzle(): MySql2Database`.

`DbManager` picks the ReactMap database by scanning configured schemas for a `useFor` entry (see `server/src/services/DbManager.js:109-121`). That selection is pure logic wrapped in a class that also opens connections, which makes it untestable. Extract the logic first so it can be tested without a database.

- [ ] **Step 1: Write the failing test**

```js
// server/test/reactMapDb.test.js
const { test, expect } = require('bun:test')
const { resolveReactMapSchema } = require('../src/db/reactMapDb')

test('picks the schema that declares a reactmap useFor category', () => {
  const schemas = [
    { host: 'scanner', useFor: ['pokemon', 'gym'] },
    { host: 'rm', useFor: ['user', 'session'] },
  ]
  expect(resolveReactMapSchema(schemas)).toEqual(schemas[1])
})

test('ignores schemas with an empty useFor', () => {
  const schemas = [{ host: 'a', useFor: [] }, { host: 'b', useFor: ['user'] }]
  expect(resolveReactMapSchema(schemas)).toEqual(schemas[1])
})

test('only user selects, matching DbManager', () => {
  // DbManager.js:118 sets reactMapDb on `User` and nothing else. A schema
  // carrying session or backup without user is one DbManager would reject.
  expect(resolveReactMapSchema([{ host: 'a', useFor: ['session', 'backup'] }])).toBeNull()
  expect(resolveReactMapSchema([{ host: 'a', useFor: ['nest', 'portal'] }])).toBeNull()
})

test('returns null when no schema serves reactmap categories', () => {
  expect(resolveReactMapSchema([{ host: 'a', useFor: ['pokemon'] }])).toBeNull()
})

test('returns null for an empty schema list', () => {
  expect(resolveReactMapSchema([])).toBeNull()
})
```

- [ ] **Step 2: Run the test and watch it fail**

Run: `bun test server/test/reactMapDb.test.js`
Expected: FAIL, `Cannot find module '../src/db/reactMapDb'`.

- [ ] **Step 3: Implement the resolver**

```js
// server/src/db/reactMapDb.js
// @ts-check

/**
 * The single `useFor` category that selects the ReactMap database.
 *
 * Only `user` does. `DbManager.js:118` sets `reactMapDb` on the capitalised
 * category `User` and on nothing else, then `bindConnections` force-binds
 * Badge, Backup, NestSubmission and Session to whichever schema won on `user`,
 * ignoring their own `useFor`. Matching any wider set would pick a schema that
 * DbManager refuses, which is auth writes going to the wrong database.
 */
const REACTMAP_CATEGORIES = new Set(['user'])

/**
 * @param {{ useFor?: string[] }[]} schemas
 * @returns {any | null}
 */
function resolveReactMapSchema(schemas) {
  for (const schema of schemas) {
    const useFor = schema.useFor || []
    if (useFor.some((category) => REACTMAP_CATEGORIES.has(category))) {
      return schema
    }
  }
  return null
}

module.exports = { resolveReactMapSchema, REACTMAP_CATEGORIES }
```

- [ ] **Step 4: Run the test and watch it pass**

Run: `bun test server/test/reactMapDb.test.js`
Expected: PASS, 4 tests.

- [ ] **Step 5: Add the Drizzle client**

Run: `bun add drizzle-orm mysql2`

```js
// server/src/db/drizzle.js
// @ts-check
const mysql = require('mysql2/promise')
const { drizzle } = require('drizzle-orm/mysql2')

const config = require('@rm/config')
const { resolveReactMapSchema } = require('./reactMapDb')

/** @type {import('drizzle-orm/mysql2').MySql2Database | null} */
let cached = null

/**
 * Drops the cached client. `bun test` runs every file in one process, so
 * without this a test that builds a client leaves it in place for every test
 * after it, including ones that mean to exercise a different configuration.
 */
function resetDrizzle() {
  cached = null
}

/**
 * Drizzle client over the ReactMap database. Built once, on first use, so that
 * importing this module never opens a connection during tests.
 */
function getDrizzle() {
  if (cached) return cached

  const schema = resolveReactMapSchema(config.getSafe('database.schemas'))
  if (!schema) {
    throw new Error(
      'No configured database schema serves ReactMap categories. Check database.schemas[].useFor.',
    )
  }

  const pool = mysql.createPool({
    host: schema.host,
    port: schema.port,
    user: schema.username,
    password: schema.password,
    database: schema.database,
  })

  cached = drizzle(pool)
  return cached
}

module.exports = { getDrizzle, resetDrizzle }
```

- [ ] **Step 6: Confirm nothing else broke**

Run: `bun test && bun run lint && bun run typecheck`
Expected: all pass. The existing server tests must be unaffected.

- [ ] **Step 7: Commit**

```bash
git add server/src/db/reactMapDb.js server/src/db/drizzle.js server/test/reactMapDb.test.js package.json bun.lock
git commit -m "feat(server): add a drizzle client for the reactmap database

Extracts the schema selection DbManager does inline so it can be tested
without a live database, then builds the drizzle client lazily on top.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 2: Create the auth tables

**Files:**
- Create: a migration via `bun run migrate:make add_better_auth_tables`
- Create: `server/src/db/authSchema.js`
- Test: `server/test/authSchema.test.js`

**Interfaces:**
- Consumes: `getDrizzle()` from Task 1.
- Produces: Drizzle tables `authUser`, `authSession`, `authAccount`, `authVerification` exported from `server/src/db/authSchema.js`.

Better Auth expects specific column names. They are transcribed here from its generated MySQL schema. Table names carry an `auth_` prefix because the default `session` name is already taken by express-mysql-session (`config/default.json:626`) and `user` is close enough to the existing `users` to be confusing.

- [ ] **Step 1: Write the failing test**

```js
// server/test/authSchema.test.js
const { test, expect } = require('bun:test')
const { getTableName } = require('drizzle-orm')
const {
  authUser,
  authSession,
  authAccount,
  authVerification,
} = require('../src/db/authSchema')

test('tables are auth-prefixed so they cannot collide with existing ones', () => {
  expect(getTableName(authUser)).toBe('auth_user')
  expect(getTableName(authSession)).toBe('auth_session')
  expect(getTableName(authAccount)).toBe('auth_account')
  expect(getTableName(authVerification)).toBe('auth_verification')
})

test('auth_user carries the columns better auth requires', () => {
  const columns = Object.keys(authUser)
  for (const name of ['id', 'name', 'email', 'emailVerified', 'image', 'createdAt', 'updatedAt']) {
    expect(columns).toContain(name)
  }
})

test('auth_account carries a password column for credential accounts', () => {
  expect(Object.keys(authAccount)).toContain('password')
})

test('auth_account carries the issuer column better auth 1.7 requires', () => {
  // Without it every sign-up throws after the user row is already written.
  expect(Object.keys(authAccount)).toContain('issuer')
})

test('auth_user carries username fields for the username plugin', () => {
  const columns = Object.keys(authUser)
  expect(columns).toContain('username')
  expect(columns).toContain('displayUsername')
})
```

- [ ] **Step 2: Run the test and watch it fail**

Run: `bun test server/test/authSchema.test.js`
Expected: FAIL, `Cannot find module '../src/db/authSchema'`.

- [ ] **Step 3: Write the Drizzle schema**

```js
// server/src/db/authSchema.js
// @ts-check
const {
  mysqlTable,
  varchar,
  text,
  timestamp,
  boolean,
  index,
  uniqueIndex,
} = require('drizzle-orm/mysql-core')

const authUser = mysqlTable('auth_user', {
  id: varchar('id', { length: 36 }).primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  emailVerified: boolean('email_verified').default(false).notNull(),
  image: text('image'),
  username: varchar('username', { length: 255 }).unique(),
  displayUsername: text('display_username'),
  createdAt: timestamp('created_at', { fsp: 3 }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { fsp: 3 }).defaultNow().notNull(),
})

const authSession = mysqlTable(
  'auth_session',
  {
    id: varchar('id', { length: 36 }).primaryKey(),
    token: varchar('token', { length: 255 }).notNull().unique(),
    expiresAt: timestamp('expires_at', { fsp: 3 }).notNull(),
    ipAddress: text('ip_address'),
    userAgent: text('user_agent'),
    userId: varchar('user_id', { length: 36 }).notNull(),
    createdAt: timestamp('created_at', { fsp: 3 }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { fsp: 3 }).defaultNow().notNull(),
  },
  (table) => [index('auth_session_user_id_idx').on(table.userId)],
)

const authAccount = mysqlTable(
  'auth_account',
  {
    id: varchar('id', { length: 36 }).primaryKey(),
    // better-auth 1.7.1 requires `issuer` on every account row, credential rows
    // included. `@better-auth/core` builds it as `local:<providerId>` for
    // credentials and `local:oauth:<providerId>` for OAuth, both URI encoded.
    // Omitting it fails at the first sign-up with "The field issuer does not
    // exist in the auth_account Drizzle schema", after the user row is written.
    issuer: varchar('issuer', { length: 191 }).notNull(),
    accountId: varchar('account_id', { length: 191 }).notNull(),
    providerId: varchar('provider_id', { length: 191 }).notNull(),
    userId: varchar('user_id', { length: 36 }).notNull(),
    accessToken: text('access_token'),
    refreshToken: text('refresh_token'),
    idToken: text('id_token'),
    accessTokenExpiresAt: timestamp('access_token_expires_at', { fsp: 3 }),
    refreshTokenExpiresAt: timestamp('refresh_token_expires_at', { fsp: 3 }),
    scope: text('scope'),
    password: text('password'),
    createdAt: timestamp('created_at', { fsp: 3 }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { fsp: 3 }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('auth_account_issuer_account_uidx').on(
      table.issuer,
      table.accountId,
    ),
    index('auth_account_user_id_idx').on(table.userId),
  ],
)

const authVerification = mysqlTable(
  'auth_verification',
  {
    id: varchar('id', { length: 36 }).primaryKey(),
    identifier: varchar('identifier', { length: 255 }).notNull(),
    value: text('value').notNull(),
    expiresAt: timestamp('expires_at', { fsp: 3 }).notNull(),
    createdAt: timestamp('created_at', { fsp: 3 }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { fsp: 3 }).defaultNow().notNull(),
  },
  (table) => [index('auth_verification_identifier_idx').on(table.identifier)],
)

module.exports = { authUser, authSession, authAccount, authVerification }
```

- [ ] **Step 4: Run the test and watch it pass**

Run: `bun test server/test/authSchema.test.js`
Expected: PASS, 4 tests.

- [ ] **Step 5: Create the Knex migration**

Run: `bun run migrate:make add_better_auth_tables`

Then replace the generated file's contents. Its name will be `server/src/db/migrations/<timestamp>_add_better_auth_tables.cjs`.

```js
// @ts-check
exports.up = async function up(knex) {
  await knex.schema.createTable('auth_user', (table) => {
    table.string('id', 36).primary()
    table.string('name', 255).notNullable()
    table.string('email', 255).notNullable().unique()
    table.boolean('email_verified').notNullable().defaultTo(false)
    table.text('image')
    table.string('username', 255).unique()
    table.text('display_username')
    table.timestamp('created_at', { precision: 3 }).notNullable().defaultTo(knex.fn.now(3))
    table.timestamp('updated_at', { precision: 3 }).notNullable().defaultTo(knex.fn.now(3))
  })

  await knex.schema.createTable('auth_session', (table) => {
    table.string('id', 36).primary()
    table.string('token', 255).notNullable().unique()
    table.timestamp('expires_at', { precision: 3 }).notNullable()
    table.text('ip_address')
    table.text('user_agent')
    table.string('user_id', 36).notNullable()
    table.timestamp('created_at', { precision: 3 }).notNullable().defaultTo(knex.fn.now(3))
    table.timestamp('updated_at', { precision: 3 }).notNullable().defaultTo(knex.fn.now(3))
    table.index('user_id', 'auth_session_user_id_idx')
    table.foreign('user_id').references('auth_user.id').onDelete('CASCADE')
  })

  await knex.schema.createTable('auth_account', (table) => {
    table.string('id', 36).primary()
    table.string('issuer', 191).notNullable()
    table.string('account_id', 191).notNullable()
    table.string('provider_id', 191).notNullable()
    table.string('user_id', 36).notNullable()
    table.text('access_token')
    table.text('refresh_token')
    table.text('id_token')
    table.timestamp('access_token_expires_at', { precision: 3 })
    table.timestamp('refresh_token_expires_at', { precision: 3 })
    table.text('scope')
    table.text('password')
    table.timestamp('created_at', { precision: 3 }).notNullable().defaultTo(knex.fn.now(3))
    table.timestamp('updated_at', { precision: 3 }).notNullable().defaultTo(knex.fn.now(3))
    table.unique(['issuer', 'account_id'], {
      indexName: 'auth_account_issuer_account_uidx',
    })
    table.index('user_id', 'auth_account_user_id_idx')
    table.foreign('user_id').references('auth_user.id').onDelete('CASCADE')
  })

  await knex.schema.createTable('auth_verification', (table) => {
    table.string('id', 36).primary()
    table.string('identifier', 255).notNullable()
    table.text('value').notNullable()
    table.timestamp('expires_at', { precision: 3 }).notNullable()
    table.timestamp('created_at', { precision: 3 }).notNullable().defaultTo(knex.fn.now(3))
    table.timestamp('updated_at', { precision: 3 }).notNullable().defaultTo(knex.fn.now(3))
    table.index('identifier', 'auth_verification_identifier_idx')
  })
}

exports.down = async function down(knex) {
  await knex.schema.dropTableIfExists('auth_verification')
  await knex.schema.dropTableIfExists('auth_account')
  await knex.schema.dropTableIfExists('auth_session')
  await knex.schema.dropTableIfExists('auth_user')
}
```

- [ ] **Step 6: Verify the migration applies and rolls back**

Run: `bun run migrate:latest && bun run migrate:rollback && bun run migrate:latest`
Expected: all three succeed. The rollback in the middle proves `down` is real, which matters because this plan's reversibility depends on it.

- [ ] **Step 7: Commit**

```bash
git add server/src/db/authSchema.js server/src/db/migrations server/test/authSchema.test.js
git commit -m "feat(server): create the better auth tables

Prefixed with auth_ because express-mysql-session already owns the
session table name and users is close enough to user to confuse.

Knex owns the DDL; the drizzle definitions exist only as the typed
surface the better auth adapter reads.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 3: Create the perms table

**Files:**
- Create: a migration via `bun run migrate:make add_user_perms_table`
- Modify: `server/src/db/authSchema.js`
- Test: `server/test/userPerms.test.js`

**Interfaces:**
- Consumes: `authUser` from Task 2.
- Produces: `userPerms` Drizzle table exported from `server/src/db/authSchema.js`.

Perms are authorization, not authentication, so they get their own table rather than riding on Better Auth's user row. Today they are two JSON blobs (`discordPerms`, `telegramPerms`) plus a `strategy` column naming which one is live, which encodes "a user has one identity" into the schema. One row per user per provider removes that.

- [ ] **Step 1: Write the failing test**

```js
// server/test/userPerms.test.js
const { test, expect } = require('bun:test')
const { getTableName } = require('drizzle-orm')
const { userPerms } = require('../src/db/authSchema')

test('perms live in their own table', () => {
  expect(getTableName(userPerms)).toBe('user_perms')
})

test('perms are keyed by user and provider, not by strategy', () => {
  const columns = Object.keys(userPerms)
  expect(columns).toContain('userId')
  expect(columns).toContain('providerId')
  expect(columns).toContain('perms')
  expect(columns).not.toContain('strategy')
})
```

- [ ] **Step 2: Run the test and watch it fail**

Run: `bun test server/test/userPerms.test.js`
Expected: FAIL, `userPerms` is undefined.

- [ ] **Step 3: Add the table to the Drizzle schema**

Add to `server/src/db/authSchema.js`, and add `userPerms` to its `module.exports`:

```js
const { json } = require('drizzle-orm/mysql-core')

const userPerms = mysqlTable(
  'user_perms',
  {
    id: varchar('id', { length: 36 }).primaryKey(),
    userId: varchar('user_id', { length: 36 }).notNull(),
    providerId: varchar('provider_id', { length: 191 }).notNull(),
    perms: json('perms').notNull(),
    updatedAt: timestamp('updated_at', { fsp: 3 }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('user_perms_user_provider_uidx').on(table.userId, table.providerId),
    index('user_perms_user_id_idx').on(table.userId),
  ],
)
```

- [ ] **Step 4: Create the migration**

Run: `bun run migrate:make add_user_perms_table`

```js
// @ts-check
exports.up = async function up(knex) {
  await knex.schema.createTable('user_perms', (table) => {
    table.string('id', 36).primary()
    table.string('user_id', 36).notNullable()
    table.string('provider_id', 191).notNullable()
    table.json('perms').notNullable()
    table.timestamp('updated_at', { precision: 3 }).notNullable().defaultTo(knex.fn.now(3))
    table.unique(['user_id', 'provider_id'], { indexName: 'user_perms_user_provider_uidx' })
    table.index('user_id', 'user_perms_user_id_idx')
    table.foreign('user_id').references('auth_user.id').onDelete('CASCADE')
  })
}

exports.down = async function down(knex) {
  await knex.schema.dropTableIfExists('user_perms')
}
```

- [ ] **Step 5: Run the tests and the migration**

Run: `bun test server/test/userPerms.test.js && bun run migrate:latest && bun run migrate:rollback && bun run migrate:latest`
Expected: 2 tests pass, all three migration commands succeed.

- [ ] **Step 6: Commit**

```bash
git add server/src/db/authSchema.js server/src/db/migrations server/test/userPerms.test.js
git commit -m "feat(server): give perms their own table

One row per user per provider. The current shape is two json blobs plus
a strategy column naming the live one, which encodes one identity per
user into the schema while link_discord_telegram exists to break exactly
that assumption.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 4: Build the Better Auth instance

**Files:**
- Create: `server/src/auth/index.js`
- Test: `server/test/authInstance.test.js`

**Interfaces:**
- Consumes: `getDrizzle()` from Task 1, the tables from Tasks 2 and 3.
- Produces: `getAuth(): ReturnType<typeof betterAuth>` from `server/src/auth/index.js`.

Local auth in ReactMap is username and password, and Better Auth's `user.email` is not null and unique, so the username plugin carries local auth rather than the email flow. Discord is a built-in social provider.

- [ ] **Step 1: Write the failing test**

```js
// server/test/authInstance.test.js
const { test, expect } = require('bun:test')
const { buildAuthOptions } = require('../src/auth')

const baseConfig = {
  strategies: [
    { name: 'discord', type: 'discord', clientId: 'cid', clientSecret: 'secret', enabled: true },
  ],
  sessionSecret: 'x'.repeat(32),
  baseURL: 'http://localhost:8080',
}

test('discord is registered as a social provider when enabled', () => {
  const options = buildAuthOptions(baseConfig)
  expect(options.socialProviders.discord).toEqual({
    clientId: 'cid',
    clientSecret: 'secret',
  })
})

test('a disabled strategy is not registered', () => {
  const options = buildAuthOptions({
    ...baseConfig,
    strategies: [{ ...baseConfig.strategies[0], enabled: false }],
  })
  expect(options.socialProviders.discord).toBeUndefined()
})

test('username and password auth is enabled', () => {
  const options = buildAuthOptions(baseConfig)
  expect(options.emailAndPassword.enabled).toBe(true)
})

test('passwords hash as bcrypt, so existing hashes keep verifying', async () => {
  const { hash, verify } = buildAuthOptions(baseConfig).emailAndPassword.password
  const hashed = await hash('reactmap')
  expect(hashed.startsWith('$2b$')).toBe(true)
  expect(await verify({ hash: hashed, password: 'reactmap' })).toBe(true)
  expect(await verify({ hash: hashed, password: 'wrong' })).toBe(false)
})

test('the auth tables are the prefixed ones, not the existing users table', () => {
  const options = buildAuthOptions(baseConfig)
  expect(options.user.modelName).toBe('auth_user')
  expect(options.session.modelName).toBe('auth_session')
})

test('the base url comes straight from config', () => {
  expect(buildAuthOptions(baseConfig).baseURL).toBe('http://localhost:8080')
})
```

- [ ] **Step 2: Run the test and watch it fail**

Run: `bun test server/test/authInstance.test.js`
Expected: FAIL, `Cannot find module '../src/auth'`.

- [ ] **Step 3: Implement it**

Run: `bun add better-auth`

```js
// server/src/auth/index.js
// @ts-check
const { betterAuth } = require('better-auth')
const { drizzleAdapter } = require('better-auth/adapters/drizzle')
const { username } = require('better-auth/plugins')

const config = require('@rm/config')
const { getDrizzle } = require('../db/drizzle')
const schema = require('../db/authSchema')

/**
 * Pure option construction, split out so the wiring can be tested without
 * opening a database connection.
 *
 * @param {{ strategies: any[], sessionSecret: string, baseURL: string }} input
 */
function buildAuthOptions(input) {
  /** @type {Record<string, { clientId: string, clientSecret: string }>} */
  const socialProviders = {}

  for (const strategy of input.strategies) {
    if (!strategy.enabled) continue
    if (strategy.type === 'discord') {
      socialProviders.discord = {
        clientId: strategy.clientId,
        clientSecret: strategy.clientSecret,
      }
    }
  }

  return {
    baseURL: input.baseURL,
    secret: input.sessionSecret,
    emailAndPassword: {
      enabled: true,
      // Better Auth hashes with scrypt by default, storing `salt:hash` hex.
      // ReactMap has always stored bcrypt (`$2b$`, cost 10, originally from
      // bcrypt@5.1.1). Those formats are not interchangeable, so a back-filled
      // hash would insert cleanly and then fail every verification, locking out
      // every local-auth user with no error anywhere to explain it.
      //
      // Staying on bcrypt keeps one format across the migration. Bun.password
      // detects the algorithm from the hash prefix, so this verifies legacy
      // rows and anything written from here on.
      password: {
        hash: (password) => Bun.password.hash(password, 'bcrypt'),
        verify: ({ hash, password }) => Bun.password.verify(password, hash),
      },
    },
    socialProviders,
    // Point at the prefixed tables. The unprefixed `session` name belongs to
    // express-mysql-session and `users` to the pre-2.0 user table.
    user: { modelName: 'auth_user' },
    session: { modelName: 'auth_session' },
    account: { modelName: 'auth_account' },
    verification: { modelName: 'auth_verification' },
  }
}

/** @type {any} */
let cached = null

function getAuth() {
  if (cached) return cached
  cached = betterAuth({
    ...buildAuthOptions({
      strategies: config.getSafe('authentication.strategies'),
      sessionSecret: config.getSafe('api.sessionSecret'),
      baseURL: config.getSafe('api.baseUrl'),
    }),
    database: drizzleAdapter(getDrizzle(), {
      provider: 'mysql',
      // The adapter resolves a model by looking up `schema[modelName]`, so the
      // keys have to be the table names, not the camelCase export names. Handing
      // it `authSchema` directly fails at runtime with "The model auth_user was
      // not found in the schema object", and no pure unit test catches it.
      schema: {
        auth_user: schema.authUser,
        auth_session: schema.authSession,
        auth_account: schema.authAccount,
        auth_verification: schema.authVerification,
      },
    }),
    plugins: [
      username({
        // Better Auth defaults to /^[a-zA-Z0-9_.]+$/, min 3, max 30. ReactMap
        // 1.x never validated usernames at all and stores them in a
        // varchar(255), so anyone whose name carries a hyphen, a space or fewer
        // than three characters would be unable to sign in after migrating.
        // These limits exist to preserve every existing login. Tightening the
        // rules for new signups is a product decision, not something to smuggle
        // into a migration.
        minUsernameLength: 1,
        maxUsernameLength: 255,
        usernameValidator: (name) => name.length > 0 && name.length <= 255,
      }),
    ],
  })
  return cached
}

module.exports = { getAuth, buildAuthOptions }
```

- [ ] **Step 4: Add the `api.baseUrl` config key**

There is no site-URL key in the config today. Callback URLs are configured per strategy, as
`redirectUri` on the discord entry, and `interface` defaults to `0.0.0.0`, which is a bind address
rather than something a browser can be redirected to. Better Auth needs one URL for the whole
instance, so add it.

In `config/default.json`, inside the `api` block beside `sessionCheckIntervalMs`:

```json
"baseUrl": "http://localhost:8080",
```

Confirm it resolves before moving on:

```bash
bun -e 'require("dotenv").config(); console.log(require("@rm/config").getSafe("api.baseUrl"))'
```

Expected: `http://localhost:8080`. A throw here means the key was added to the wrong block.

- [ ] **Step 5: Run the test and watch it pass**

Run: `bun test server/test/authInstance.test.js`
Expected: PASS, 5 tests.

- [ ] **Step 6: Prove the instance actually works against the database**

Everything above tests `buildAuthOptions`, which is pure. That is deliberate, but it means none of
it would notice if Better Auth could not reach the tables at all. Exercise the real thing once:

```bash
bun -e '
require("dotenv").config()
const { getAuth } = require("./server/src/auth")
const auth = getAuth()
const u = "planprobe"
try {
  const up = await auth.api.signUpEmail({
    body: { email: u + "@x.invalid", password: "probe-password-123", name: "probe", username: u },
  })
  console.log("signUp OK", up.user.id.slice(0, 8))
  const si = await auth.api.signInUsername({
    body: { username: u, password: "probe-password-123" },
  })
  console.log("signIn OK", Boolean(si))
} catch (e) {
  console.log("FAILED", e.body ? JSON.stringify(e.body) : e.message.split("\n")[0])
}
process.exit(0)'
```

Expected: `signUp OK <id>` then `signIn OK true`.

A `The model "auth_user" was not found in the schema object` here means the adapter schema keys do
not match the model names. An `INVALID_USERNAME` means the username plugin options did not apply.

Then also confirm a legacy-shaped username survives, because that is what Task 6 depends on:

```bash
bun -e '
require("dotenv").config()
const { getAuth } = require("./server/src/auth")
const auth = getAuth()
for (const u of ["ash-ketchum", "jo", "a.b_c"]) {
  try {
    await auth.api.signUpEmail({
      body: { email: u + "@x.invalid", password: "probe-password-123", name: "p", username: u },
    })
    console.log("accepted", u)
  } catch (e) { console.log("REJECTED", u, e.body ? JSON.stringify(e.body) : e.message) }
}
process.exit(0)'
```

Expected: all three accepted. A rejection means someone with that username cannot log in after the
migration.

Clean up afterwards, since these rows are probes and not fixtures:

```bash
mysql -u root -D reactmap_dev -e \
  "DELETE FROM auth_user WHERE email LIKE '%@x.invalid';"
```

Put the real output of all three commands in the task report.

- [ ] **Step 7: Commit**

```bash
git add server/src/auth/index.js server/test/authInstance.test.js config/default.json package.json bun.lock
git commit -m "feat(server): add the better auth instance

Option construction is split from instantiation so the provider wiring
can be tested without opening a connection.

Local auth uses the username plugin rather than the email flow, because
reactmap logins are usernames and better auth requires email to be non
null and unique.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 5: Telegram login verification

**Files:**
- Create: `server/src/auth/telegram.js`
- Test: `server/test/telegramVerify.test.js`

**Interfaces:**
- Consumes: nothing.
- Produces: `verifyTelegramLogin(payload, botToken, opts): { ok: true, user } | { ok: false, reason }`.

Telegram's Login Widget is not OAuth2, which is why no library ships it as a provider. It posts a payload signed with an HMAC derived from the bot token. Verification is: build a newline-joined `key=value` string of every field except `hash`, sorted by key; HMAC-SHA256 it with `SHA256(botToken)` as the key; compare against `hash` in constant time; then reject stale payloads.

This is security-relevant code. The comparison must be constant time and the staleness check must not be skipped, because without it a captured payload replays forever.

- [ ] **Step 1: Write the failing test**

```js
// server/test/telegramVerify.test.js
const { test, expect } = require('bun:test')
const crypto = require('crypto')
const { verifyTelegramLogin } = require('../src/auth/telegram')

const BOT_TOKEN = '123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11'

function sign(payload, botToken = BOT_TOKEN) {
  const checkString = Object.keys(payload)
    .filter((k) => k !== 'hash')
    .sort()
    .map((k) => `${k}=${payload[k]}`)
    .join('\n')
  const secret = crypto.createHash('sha256').update(botToken).digest()
  const hash = crypto.createHmac('sha256', secret).update(checkString).digest('hex')
  return { ...payload, hash }
}

const now = () => Math.floor(Date.now() / 1000)

test('accepts a correctly signed, fresh payload', () => {
  const payload = sign({ id: '42', first_name: 'A', username: 'a', auth_date: String(now()) })
  const result = verifyTelegramLogin(payload, BOT_TOKEN)
  expect(result.ok).toBe(true)
  expect(result.user.id).toBe('42')
})

test('rejects a tampered payload', () => {
  const payload = sign({ id: '42', first_name: 'A', auth_date: String(now()) })
  const result = verifyTelegramLogin({ ...payload, id: '43' }, BOT_TOKEN)
  expect(result.ok).toBe(false)
  expect(result.reason).toBe('bad-signature')
})

test('rejects a payload signed with a different bot token', () => {
  const payload = sign({ id: '42', auth_date: String(now()) }, '999:OTHER')
  expect(verifyTelegramLogin(payload, BOT_TOKEN).ok).toBe(false)
})

test('rejects a stale payload even when the signature is valid', () => {
  const stale = String(now() - 3600)
  const payload = sign({ id: '42', first_name: 'A', auth_date: stale })
  const result = verifyTelegramLogin(payload, BOT_TOKEN)
  expect(result.ok).toBe(false)
  expect(result.reason).toBe('expired')
})

test('rejects a payload with no hash', () => {
  const result = verifyTelegramLogin({ id: '42', auth_date: String(now()) }, BOT_TOKEN)
  expect(result.ok).toBe(false)
  expect(result.reason).toBe('bad-signature')
})

test('rejects a payload with no auth_date', () => {
  const payload = sign({ id: '42', first_name: 'A' })
  expect(verifyTelegramLogin(payload, BOT_TOKEN).ok).toBe(false)
})
```

- [ ] **Step 2: Run the test and watch it fail**

Run: `bun test server/test/telegramVerify.test.js`
Expected: FAIL, `Cannot find module '../src/auth/telegram'`.

- [ ] **Step 3: Implement it**

```js
// server/src/auth/telegram.js
// @ts-check
const crypto = require('crypto')

/** Telegram login payloads older than this are refused. */
const DEFAULT_MAX_AGE_SECONDS = 300

/**
 * Verifies a Telegram Login Widget payload.
 *
 * Telegram does not use OAuth2 here. The widget posts the profile fields plus
 * an HMAC keyed on SHA256(botToken), so verification is entirely local and no
 * network call is involved.
 *
 * @param {Record<string, string>} payload
 * @param {string} botToken
 * @param {{ maxAgeSeconds?: number, nowSeconds?: number }} [opts]
 */
function verifyTelegramLogin(payload, botToken, opts = {}) {
  const maxAge = opts.maxAgeSeconds ?? DEFAULT_MAX_AGE_SECONDS
  const now = opts.nowSeconds ?? Math.floor(Date.now() / 1000)

  const { hash } = payload
  if (typeof hash !== 'string' || hash.length === 0) {
    return { ok: /** @type {const} */ (false), reason: 'bad-signature' }
  }

  const checkString = Object.keys(payload)
    .filter((key) => key !== 'hash')
    .sort()
    .map((key) => `${key}=${payload[key]}`)
    .join('\n')

  const secret = crypto.createHash('sha256').update(botToken).digest()
  const expected = crypto
    .createHmac('sha256', secret)
    .update(checkString)
    .digest('hex')

  const given = Buffer.from(hash, 'hex')
  const want = Buffer.from(expected, 'hex')
  // timingSafeEqual throws on a length mismatch, so guard before comparing.
  if (given.length !== want.length || !crypto.timingSafeEqual(given, want)) {
    return { ok: /** @type {const} */ (false), reason: 'bad-signature' }
  }

  // Signature checks out, so the payload is authentic. It may still be a
  // replay of an old one, which is what auth_date is for.
  const authDate = Number(payload.auth_date)
  if (!Number.isFinite(authDate) || now - authDate > maxAge) {
    return { ok: /** @type {const} */ (false), reason: 'expired' }
  }

  return {
    ok: /** @type {const} */ (true),
    user: {
      id: payload.id,
      username: payload.username,
      firstName: payload.first_name,
      lastName: payload.last_name,
      photoUrl: payload.photo_url,
    },
  }
}

module.exports = { verifyTelegramLogin, DEFAULT_MAX_AGE_SECONDS }
```

- [ ] **Step 4: Run the test and watch it pass**

Run: `bun test server/test/telegramVerify.test.js`
Expected: PASS, 6 tests.

- [ ] **Step 5: Wrap the verifier in a Better Auth plugin**

The verifier is pure and fully tested, but nothing calls it yet, and Task 9 deletes the Telegram
passport strategy. Without this step Telegram login stops working at that point.

Better Auth plugins expose endpoints through `createAuthEndpoint`. Confirm its exact signature
against the installed version before writing this, with
`cat node_modules/better-auth/dist/plugins/index.d.ts | head -60`, because the shape changed
between majors. The logic below does not change with the signature.

```js
// append to server/src/auth/telegram.js
const { createAuthEndpoint } = require('better-auth/plugins')

/**
 * Exposes POST /api/auth/telegram. On a valid payload it finds or creates the
 * user carrying a `telegram` account row, then issues a session.
 *
 * @param {{ botToken: string }} options
 */
function telegramPlugin(options) {
  return {
    id: 'telegram',
    endpoints: {
      telegramCallback: createAuthEndpoint(
        '/telegram',
        { method: 'POST' },
        async (ctx) => {
          const result = verifyTelegramLogin(ctx.body, options.botToken)
          if (!result.ok) {
            return ctx.json({ error: result.reason }, { status: 401 })
          }
          const user = await ctx.context.internalAdapter.findUserByAccount({
            providerId: 'telegram',
            accountId: result.user.id,
          })
          if (!user) {
            return ctx.json({ error: 'no-linked-account' }, { status: 403 })
          }
          const session = await ctx.context.internalAdapter.createSession(user.id, ctx.request)
          await ctx.setSignedCookie(
            ctx.context.authCookies.sessionToken.name,
            session.token,
            ctx.context.secret,
            ctx.context.authCookies.sessionToken.options,
          )
          return ctx.json({ user, session })
        },
      ),
    },
  }
}
```

Register it in `server/src/auth/index.js`, replacing the `plugins` line from Task 4:

```js
const { telegramPlugin } = require('./telegram')

// inside getAuth(), replacing `plugins: [username()]`
const telegram = config
  .getSafe('authentication.strategies')
  .find((s) => s.type === 'telegram' && s.enabled)

plugins: [username(), ...(telegram ? [telegramPlugin({ botToken: telegram.botToken })] : [])],
```

An unlinked Telegram id is refused rather than silently creating an account, because the back-fill
in Task 6 is what links existing people and a new path that mints users would bypass it.

- [ ] **Step 6: Confirm the plugin loads**

Run: `bun test && bun server/src/index.js`
Expected: tests pass and the server reaches its listening log line. A malformed plugin fails at
`betterAuth()` construction, so booting is the check that matters here. Stop it with Ctrl-C.

- [ ] **Step 7: Commit**

```bash
git add server/src/auth/telegram.js server/src/auth/index.js server/test/telegramVerify.test.js
git commit -m "feat(server): verify telegram login widget payloads

Telegram is not oauth2 here, so no library ships it as a provider. The
widget posts profile fields plus an hmac keyed on sha256 of the bot
token, which makes verification entirely local.

Compares in constant time and refuses payloads older than five minutes,
since a valid signature alone does not rule out a replay.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 6: Back-fill existing users

**Files:**
- Create: `server/src/auth/backfill.js`
- Test: `server/test/authBackfill.test.js`

**Interfaces:**
- Consumes: the tables from Tasks 2 and 3.
- Produces: `planBackfill(userRow): { user, accounts, perms }`.

This is the task where being wrong is expensive: a mistake locks people out of their accounts. It is split so the mapping is pure and exhaustively tested, and the row writing is a thin loop over it.

A user row today carries `id`, `username`, `password`, `discordId`, `telegramId`, `discordPerms`, `telegramPerms`, `strategy`, `webhookStrategy`, `selectedWebhook`, `tutorial`, `useAppShell` and `data`. One row fans out into one `auth_user`, one `auth_account` per identity, and one `user_perms` per provider that has perms.

- [ ] **Step 1: Write the failing test**

```js
// server/test/authBackfill.test.js
const { test, expect } = require('bun:test')
const { planBackfill } = require('../src/auth/backfill')

test('accounts carry the issuer strings better auth generates', () => {
  const plan = planBackfill({
    id: 7, username: 'ash', password: '$2b$10$h', discordId: '99', telegramId: '55',
  })
  const byProvider = Object.fromEntries(plan.accounts.map((a) => [a.providerId, a.issuer]))
  expect(byProvider.credential).toBe('local:credential')
  expect(byProvider.discord).toBe('local:oauth:discord')
  // Telegram is a local provider, not OAuth. Its plugin looks this exact string
  // up, so `local:oauth:telegram` would be invisible to it and every migrated
  // Telegram user would silently fail to sign in.
  expect(byProvider.telegram).toBe('local:telegram')
})

test('a local account keeps its password hash on the account row', () => {
  const plan = planBackfill({
    id: 7, username: 'ash', password: '$2b$10$hash', strategy: 'local',
  })
  const credential = plan.accounts.find((a) => a.providerId === 'credential')
  expect(credential.password).toBe('$2b$10$hash')
  // Better Auth uses the user's own id as the credential accountId, not the
  // username. Confirmed against a row it wrote itself.
  expect(credential.accountId).toBe(plan.user.id)
  expect(plan.user.username).toBe('ash')
})

test('a discord identity becomes an account row, not a column', () => {
  const plan = planBackfill({ id: 7, discordId: '99', strategy: 'discord' })
  const discord = plan.accounts.find((a) => a.providerId === 'discord')
  expect(discord.accountId).toBe('99')
  expect(plan.user).not.toHaveProperty('discordId')
})

test('a linked user gets one account row per identity', () => {
  const plan = planBackfill({
    id: 7, username: 'ash', password: '$2b$10$h', discordId: '99', telegramId: '55',
  })
  expect(plan.accounts.map((a) => a.providerId).sort()).toEqual([
    'credential', 'discord', 'telegram',
  ])
})

test('perms become one row per provider that has them', () => {
  const plan = planBackfill({
    id: 7,
    discordId: '99',
    discordPerms: { map: true },
    telegramId: '55',
    telegramPerms: { map: false },
  })
  expect(plan.perms).toHaveLength(2)
  expect(plan.perms.find((p) => p.providerId === 'discord').perms).toEqual({ map: true })
})

test('absent perms produce no rows rather than empty ones', () => {
  const plan = planBackfill({ id: 7, discordId: '99' })
  expect(plan.perms).toHaveLength(0)
})

test('a user with no password gets no credential account', () => {
  const plan = planBackfill({ id: 7, username: 'ash', discordId: '99' })
  expect(plan.accounts.find((a) => a.providerId === 'credential')).toBeUndefined()
})

test('the auth user id is derived from the legacy id so the mapping is stable', () => {
  expect(planBackfill({ id: 7 }).user.id).toBe(planBackfill({ id: 7 }).user.id)
  expect(planBackfill({ id: 7 }).user.id).not.toBe(planBackfill({ id: 8 }).user.id)
})

test('reactmap-owned preferences ride along on the user row', () => {
  const plan = planBackfill({ id: 7, tutorial: true, useAppShell: true })
  expect(plan.user.legacyId).toBe(7)
})
```

- [ ] **Step 2: Run the test and watch it fail**

Run: `bun test server/test/authBackfill.test.js`
Expected: FAIL, `Cannot find module '../src/auth/backfill'`.

- [ ] **Step 3: Implement the mapping**

```js
// server/src/auth/backfill.js
// @ts-check
const crypto = require('crypto')

// Import the issuer helpers rather than reimplementing them. A row this
// back-fill writes has to look exactly like one Better Auth would have written,
// and getting it wrong does not fail loudly: the row inserts fine and the person
// simply cannot sign in. Reconstructing the format by hand is how that happens,
// so the library stays the single source of truth.
//
// Which helper applies is per provider, and it is not guessable from the name.
// Telegram is a local provider, not OAuth, because its login widget is an
// HMAC-signed payload rather than an OAuth2 flow. So it gets `local:telegram`
// while Discord gets `local:oauth:discord`. The Telegram plugin in
// `server/src/auth/telegram.js` looks up `createLocalAccountIssuer('telegram')`,
// and a row written under any other issuer is invisible to it.
const {
  createLocalAccountIssuer,
  createOAuthAccountIssuer,
} = require('better-auth/db')

/**
 * Derives a stable auth_user id from the legacy numeric id, so the back-fill
 * is idempotent: running it twice produces the same ids and the second run is
 * an upsert rather than a duplicate.
 *
 * @param {string | number} legacyId
 */
function authIdForLegacy(legacyId) {
  return crypto
    .createHash('sha256')
    .update(`reactmap-user:${legacyId}`)
    .digest('hex')
    .slice(0, 36)
}

/**
 * Fans one legacy users row out into the rows the auth tables expect.
 * Pure: it decides what to write, it does not write anything.
 *
 * @param {Record<string, any>} row
 */
function planBackfill(row) {
  const id = authIdForLegacy(row.id)

  const user = {
    id,
    legacyId: row.id,
    name: row.username || String(row.id),
    username: row.username || null,
    displayUsername: row.username || null,
    // No email exists in the legacy schema and better auth requires the column
    // to be unique and non null, so a routable-looking placeholder is derived
    // per user. The username plugin is what people actually log in with.
    email: `${id}@users.noreply.reactmap.invalid`,
    emailVerified: false,
  }

  const accounts = []
  if (row.password) {
    accounts.push({
      providerId: 'credential',
      issuer: createLocalAccountIssuer('credential'),
      // Better Auth writes the user's own id here for credential accounts,
      // verified by inspecting a row it created. Putting the username here
      // instead would diverge from every row Better Auth writes afterwards.
      accountId: id,
      userId: id,
      password: row.password,
    })
  }
  if (row.discordId) {
    accounts.push({
      providerId: 'discord',
      issuer: createOAuthAccountIssuer('discord'),
      accountId: String(row.discordId),
      userId: id,
    })
  }
  if (row.telegramId) {
    accounts.push({
      providerId: 'telegram',
      issuer: createLocalAccountIssuer('telegram'),
      accountId: String(row.telegramId),
      userId: id,
    })
  }

  const perms = []
  if (row.discordPerms) {
    perms.push({ userId: id, providerId: 'discord', perms: row.discordPerms })
  }
  if (row.telegramPerms) {
    perms.push({ userId: id, providerId: 'telegram', perms: row.telegramPerms })
  }

  return { user, accounts, perms }
}

module.exports = { planBackfill, authIdForLegacy }
```

- [ ] **Step 4: Run the test and watch it pass**

Run: `bun test server/test/authBackfill.test.js`
Expected: PASS, 8 tests.

- [ ] **Step 5: Add the migration that applies the plan**

Run: `bun run migrate:make backfill_auth_users`

```js
// @ts-check
const config = require('@rm/config')
const { planBackfill } = require('../../auth/backfill')

exports.up = async function up(knex) {
  const usersTable = config.getSafe('database.settings.userTableName')
  const rows = await knex(usersTable).select('*')

  for (const row of rows) {
    const { user, accounts, perms } = planBackfill(row)

    // The legacy id is not a column on auth_user, so it is dropped here. It
    // lives on in the derived id, which authIdForLegacy can recompute.
    const { legacyId, ...userRow } = user

    await knex('auth_user').insert(userRow).onConflict('id').merge()

    for (const account of accounts) {
      await knex('auth_account')
        .insert({ id: `${account.userId}:${account.providerId}`, ...account })
        .onConflict(['issuer', 'account_id'])
        .merge()
    }

    for (const perm of perms) {
      await knex('user_perms')
        .insert({
          id: `${perm.userId}:${perm.providerId}`,
          user_id: perm.userId,
          provider_id: perm.providerId,
          perms: JSON.stringify(perm.perms),
        })
        .onConflict(['user_id', 'provider_id'])
        .merge()
    }
  }
}

exports.down = async function down(knex) {
  // The legacy users table was only read, so undoing the back-fill is a
  // matter of emptying what it wrote.
  await knex('user_perms').del()
  await knex('auth_account').del()
  await knex('auth_user').del()
}
```

- [ ] **Step 6: Verify the back-fill is idempotent**

Run: `bun run migrate:latest && bun run migrate:rollback && bun run migrate:latest && bun run migrate:latest`
Expected: every command succeeds. The second `migrate:latest` is a no-op because the migration is already recorded; the point of the sequence is proving `down` empties cleanly and `up` re-runs from empty.

Then confirm no user was dropped:

```bash
bun run --silent server -e 'true' 2>/dev/null || true
```

Compare row counts directly in MySQL: `SELECT COUNT(*) FROM users;` against `SELECT COUNT(*) FROM auth_user;`. They must be equal. Report both numbers in the task report.

- [ ] **Step 7: Commit**

```bash
git add server/src/auth/backfill.js server/src/db/migrations server/test/authBackfill.test.js
git commit -m "feat(server): back-fill existing users into the auth tables

One legacy row fans out into an auth_user, an auth_account per linked
identity, and a user_perms row per provider that has perms.

The auth id is derived from the legacy id by hash, which makes the
back-fill idempotent and lets the mapping be recomputed later. The
legacy users table is only read, never written, so down empties the new
tables and nothing else.

Local password hashes move to account.password unchanged. Rewriting one
would lock a person out of their account.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 7: Mount Better Auth beside passport

**Files:**
- Modify: `server/src/index.js`
- Test: `server/test/authMount.test.js`

**Interfaces:**
- Consumes: `getAuth()` from Task 4.
- Produces: Better Auth handling `/api/auth/*`. Passport keeps every route it has today.

Both systems run at once. Nothing is removed until Task 9, so a failure here is a bad new endpoint rather than an app nobody can log into.

- [ ] **Step 1: Write the failing test**

```js
// server/test/authMount.test.js
const { test, expect } = require('bun:test')
const { buildAuthRoutePrefix, isAuthRequest } = require('../src/auth')

test('better auth owns its own prefix', () => {
  expect(buildAuthRoutePrefix()).toBe('/api/auth')
})

test('auth requests are recognised by prefix', () => {
  expect(isAuthRequest('/api/auth/sign-in/username')).toBe(true)
  expect(isAuthRequest('/api/auth')).toBe(true)
})

test('existing passport routes are not captured', () => {
  expect(isAuthRequest('/auth/discord/callback')).toBe(false)
  expect(isAuthRequest('/api/settings')).toBe(false)
  expect(isAuthRequest('/graphql')).toBe(false)
})
```

- [ ] **Step 2: Run the test and watch it fail**

Run: `bun test server/test/authMount.test.js`
Expected: FAIL, `buildAuthRoutePrefix is not a function`.

- [ ] **Step 3: Add the helpers and mount the handler**

Add to `server/src/auth/index.js`, exporting both:

```js
const AUTH_ROUTE_PREFIX = '/api/auth'

function buildAuthRoutePrefix() {
  return AUTH_ROUTE_PREFIX
}

/**
 * Passport currently owns `/auth/*`, so better auth is mounted under
 * `/api/auth/*` and the two do not overlap while both are running.
 *
 * @param {string} pathname
 */
function isAuthRequest(pathname) {
  return pathname === AUTH_ROUTE_PREFIX || pathname.startsWith(`${AUTH_ROUTE_PREFIX}/`)
}
```

In `server/src/index.js`, add the import beside the others:

```js
const { toNodeHandler } = require('better-auth/node')
const { getAuth, buildAuthRoutePrefix } = require('./auth')
```

and mount it immediately before `app.use(rootRouter)`:

```js
  // Better auth reads the raw body itself, so it must sit ahead of any json
  // body parser that would consume the stream first.
  app.all(`${buildAuthRoutePrefix()}/*`, toNodeHandler(getAuth()))

  app.use(rootRouter)
```

- [ ] **Step 4: Run the test and watch it pass**

Run: `bun test server/test/authMount.test.js`
Expected: PASS, 3 tests.

- [ ] **Step 5: Confirm the server still boots with both systems mounted**

Run: `bun server/src/index.js`
Expected: the log line `Server is now listening at http://<interface>:<port>` appears and the process stays up. Stop it with Ctrl-C.

This step is not optional and its output goes in the task report. A server that cannot start is the failure mode a diff review does not catch.

- [ ] **Step 6: Commit**

```bash
git add server/src/index.js server/src/auth/index.js server/test/authMount.test.js
git commit -m "feat(server): mount better auth beside passport

Better auth takes /api/auth/* while passport keeps /auth/*, so both run
at once and nothing is removed yet. Mounted ahead of the json parser
because it reads the raw body itself.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 8: Populate req.user from Better Auth

**Files:**
- Create: `server/src/middleware/authSession.js`
- Modify: `server/src/index.js`
- Test: `server/test/authSessionMiddleware.test.js`

**Interfaces:**
- Consumes: `getAuth()` from Task 4, `userPerms` from Task 3.
- Produces: `authSessionMiddleware(deps)` returning an Express middleware.

The rest of the app reads `req.user` and `req.session.perms`. Those come from passport today. This middleware supplies the same shapes from Better Auth so downstream code does not change, and it defers to passport when Better Auth has no session, which keeps existing logins working through the cut-over.

- [ ] **Step 1: Write the failing test**

```js
// server/test/authSessionMiddleware.test.js
const { test, expect } = require('bun:test')
const { mergePerms, authSessionMiddleware } = require('../src/middleware/authSession')

test('perms rows merge into one object', () => {
  expect(mergePerms([
    { providerId: 'discord', perms: { map: true, admin: false } },
    { providerId: 'telegram', perms: { admin: true } },
  ])).toEqual({ map: true, admin: true })
})

test('a true from any provider wins', () => {
  expect(mergePerms([
    { providerId: 'discord', perms: { admin: false } },
    { providerId: 'telegram', perms: { admin: true } },
  ]).admin).toBe(true)
})

test('no rows merge to an empty object, not undefined', () => {
  expect(mergePerms([])).toEqual({})
})

test('an existing passport user is left alone when better auth has no session', async () => {
  const middleware = authSessionMiddleware({
    getSession: async () => null,
    getPerms: async () => [],
  })
  const req = { headers: {}, user: { id: 'passport-user' }, session: {} }
  let called = false
  await middleware(req, {}, () => { called = true })
  expect(called).toBe(true)
  expect(req.user.id).toBe('passport-user')
})

test('a better auth session replaces req.user and fills perms', async () => {
  const middleware = authSessionMiddleware({
    getSession: async () => ({ user: { id: 'abc', username: 'ash' } }),
    getPerms: async () => [{ providerId: 'discord', perms: { map: true } }],
  })
  const req = { headers: {}, session: {} }
  await middleware(req, {}, () => {})
  expect(req.user.id).toBe('abc')
  expect(req.session.perms).toEqual({ map: true })
})
```

- [ ] **Step 2: Run the test and watch it fail**

Run: `bun test server/test/authSessionMiddleware.test.js`
Expected: FAIL, `Cannot find module '../src/middleware/authSession'`.

- [ ] **Step 3: Implement it**

```js
// server/src/middleware/authSession.js
// @ts-check
const { eq } = require('drizzle-orm')

const { log, TAGS } = require('@rm/logger')

/**
 * Folds the per-provider perms rows into the single object the app expects.
 * A true from any provider wins, which matches how a linked account behaves
 * today: linking never removes an ability the person already had.
 *
 * @param {{ providerId: string, perms: Record<string, boolean> }[]} rows
 */
function mergePerms(rows) {
  /** @type {Record<string, any>} */
  const merged = {}
  for (const row of rows) {
    for (const [key, value] of Object.entries(row.perms || {})) {
      merged[key] = merged[key] || value
    }
  }
  return merged
}

/**
 * Supplies `req.user` and `req.session.perms` from better auth, falling back
 * to whatever passport already set. Dependencies are injected so the branching
 * can be tested without a database or a live auth instance.
 *
 * @param {{ getSession: (headers: any) => Promise<any>, getPerms: (userId: string) => Promise<any[]> }} deps
 */
function authSessionMiddleware(deps) {
  return async function middleware(req, _res, next) {
    try {
      const session = await deps.getSession(req.headers)
      if (session?.user) {
        req.user = session.user
        req.session = req.session || {}
        req.session.perms = mergePerms(await deps.getPerms(session.user.id))
      }
    } catch (e) {
      // A failure here must not take the request down: passport is still
      // mounted and may well have authenticated this person already.
      log.warn(TAGS.auth, 'better auth session lookup failed', e)
    }
    next()
  }
}

/** Wires the middleware to the real auth instance and database. */
function createAuthSessionMiddleware() {
  const { getAuth } = require('../auth')
  const { getDrizzle } = require('../db/drizzle')
  const { userPerms } = require('../db/authSchema')

  return authSessionMiddleware({
    getSession: (headers) => getAuth().api.getSession({ headers }),
    getPerms: (userId) =>
      getDrizzle().select().from(userPerms).where(eq(userPerms.userId, userId)),
  })
}

module.exports = { authSessionMiddleware, mergePerms, createAuthSessionMiddleware }
```

In `server/src/index.js`, add the import and insert the middleware directly after `initPassport(app)` so it runs once passport has had its turn:

```js
const { createAuthSessionMiddleware } = require('./middleware/authSession')
```

```js
  initPassport(app)
  app.use(createAuthSessionMiddleware())
```

- [ ] **Step 4: Run the test and watch it pass**

Run: `bun test server/test/authSessionMiddleware.test.js`
Expected: PASS, 5 tests.

- [ ] **Step 5: Confirm the server still boots**

Run: `bun server/src/index.js`
Expected: the listening log line appears and the process stays up. Stop it with Ctrl-C. Put the output in the task report.

- [ ] **Step 6: Commit**

```bash
git add server/src/middleware/authSession.js server/src/index.js server/test/authSessionMiddleware.test.js
git commit -m "feat(server): fill req.user from better auth

Supplies the same req.user and req.session.perms shapes passport does, so
downstream code is untouched, and defers to passport when better auth has
no session. That keeps existing logins working across the cut-over.

Perms merge with a true from any provider winning, matching how linking
behaves today: it never removes an ability someone already had.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 9: Remove passport and express-session

**Files:**
- Modify: `server/src/index.js`
- Delete: `server/src/middleware/passport.js`, `server/src/middleware/session.js`, `server/src/strategies/discord.js`, `server/src/strategies/local.js`, `server/src/strategies/telegram.js`
- Test: `server/test/passportRemoved.test.js`

**Interfaces:**
- Consumes: everything from Tasks 4 through 8.
- Produces: an app whose only auth is Better Auth.

- [ ] **Step 1: Write the failing test**

```js
// server/test/passportRemoved.test.js
const { test, expect } = require('bun:test')
const fs = require('fs')
const path = require('path')

const serverSrc = path.join(__dirname, '..', 'src')

test('the passport and session middleware files are gone', () => {
  expect(fs.existsSync(path.join(serverSrc, 'middleware/passport.js'))).toBe(false)
  expect(fs.existsSync(path.join(serverSrc, 'middleware/session.js'))).toBe(false)
})

test('the strategies directory is gone', () => {
  expect(fs.existsSync(path.join(serverSrc, 'strategies'))).toBe(false)
})

test('the entry point no longer references passport', () => {
  const entry = fs.readFileSync(path.join(serverSrc, 'index.js'), 'utf8')
  expect(entry).not.toContain('passport')
  expect(entry).not.toContain('sessionMiddleware')
})

test('passport packages are no longer dependencies', () => {
  const pkg = JSON.parse(
    fs.readFileSync(path.join(__dirname, '..', '..', 'package.json'), 'utf8'),
  )
  const deps = Object.keys(pkg.dependencies || {})
  expect(deps.filter((d) => d.startsWith('passport'))).toEqual([])
  expect(deps).not.toContain('express-session')
  expect(deps).not.toContain('express-mysql-session')
})
```

- [ ] **Step 2: Run the test and watch it fail**

Run: `bun test server/test/passportRemoved.test.js`
Expected: FAIL on every assertion, because none of it has been removed yet.

- [ ] **Step 3: Remove it**

```bash
rm server/src/middleware/passport.js server/src/middleware/session.js
rm -r server/src/strategies
bun remove passport passport-discord passport-local @rainb0w-clwn/passport-telegram-official express-session express-mysql-session
```

In `server/src/index.js`, delete the `initPassport` and `sessionMiddleware` imports, remove `sessionMiddleware()` from the `app.use(...)` stack, and delete the `initPassport(app)` call. The `createAuthSessionMiddleware()` line added in Task 8 stays and now runs on its own.

Then find and fix every remaining reference:

```bash
grep -rn "passport\|sessionMiddleware\|req.logout\|req.login\|isAuthenticated" server/src/ || echo "clean"
```

Each hit must be replaced with the Better Auth equivalent: `req.login` becomes a Better Auth sign-in call, `req.logout` becomes `getAuth().api.signOut({ headers: req.headers })`, and `req.isAuthenticated()` becomes `Boolean(req.user)`.

- [ ] **Step 4: Run the whole suite**

Run: `bun test && bun run lint && bun run typecheck`
Expected: all pass, including `server/test/passportRemoved.test.js` at 4 tests. Any pre-existing test that asserted passport behaviour is updated in this task rather than deleted, and the report says which ones changed and why.

- [ ] **Step 5: Confirm the server boots with only Better Auth**

Run: `bun server/src/index.js`
Expected: the listening log line appears and the process stays up. Stop it with Ctrl-C.

Then prove a back-filled password still works, end to end. A boot alone does not show that, and this
is the failure that would lock people out.

Do not use a real person's credentials. Create a legacy-shaped user with a password you chose, run
the back-fill over it, and sign in as that user:

```bash
# 1. Hash a known password the same way the legacy rows were hashed.
bun -e 'console.log(await Bun.password.hash("plan-6a-test-password", "bcrypt"))'

# 2. Insert a legacy user carrying that hash, using the hash printed above.
mysql -e "INSERT INTO users (username, password, strategy) \
          VALUES ('plan6a-probe', '<hash from step 1>', 'local');" <your reactmap database>

# 3. Re-run the back-fill over the new row.
bun run migrate:rollback && bun run migrate:latest

# 4. Sign in as the probe user against the running server.
curl -s -i -X POST http://localhost:8080/api/auth/sign-in/username \
  -H 'Content-Type: application/json' \
  -d '{"username":"plan6a-probe","password":"plan-6a-test-password"}' | head -20

# 5. Remove the probe user from both tables.
mysql -e "DELETE FROM users WHERE username = 'plan6a-probe';" <your reactmap database>
```

Expected at step 4: `HTTP/1.1 200` and a `set-cookie` header carrying a `better-auth` session token.
Paste those two lines into the task report.

A 401 means the back-fill did not carry the password hash through intact. That is a Task 6 defect.
Report it and stop; do not work around it here, because the workaround for a hash that does not
verify is almost always to rewrite the hash, which is exactly how people get locked out.

- [ ] **Step 6: Commit**

```bash
git add -A server/src server/test package.json bun.lock
git commit -m "feat(server): remove passport and express-session

Better auth has been serving sessions alongside these since the previous
commits, so this deletes the second system rather than switching to a
new one.

Verified by signing in as an existing user against the running server and
confirming a session cookie comes back, which is the check that proves the
back-filled password hashes survived.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 10: Configure trust proxy

**Files:**
- Modify: `server/src/index.js`
- Test: `server/test/trustProxy.test.js`

**Interfaces:**
- Consumes: nothing.
- Produces: a `trustProxy` setting read from config.

`trust proxy` is configured nowhere in the app today. Behind the reverse proxy that is the normal deployment, `req.ip` is therefore the proxy's address, so rate limiting and anything else IP-derived reads the wrong value. Better Auth records `ipAddress` on every session row, which makes this worth fixing now rather than later.

- [ ] **Step 1: Write the failing test**

```js
// server/test/trustProxy.test.js
const { test, expect } = require('bun:test')
const { resolveTrustProxy } = require('../src/middleware/trustProxy')

test('defaults to disabled, which is the safe choice when unset', () => {
  expect(resolveTrustProxy(undefined)).toBe(false)
})

test('a hop count passes through as a number', () => {
  expect(resolveTrustProxy(1)).toBe(1)
})

test('a numeric string becomes a number so config files can use either', () => {
  expect(resolveTrustProxy('2')).toBe(2)
})

test('a subnet name passes through unchanged', () => {
  expect(resolveTrustProxy('loopback')).toBe('loopback')
})

test('booleans pass through', () => {
  expect(resolveTrustProxy(true)).toBe(true)
  expect(resolveTrustProxy(false)).toBe(false)
})
```

- [ ] **Step 2: Run the test and watch it fail**

Run: `bun test server/test/trustProxy.test.js`
Expected: FAIL, `Cannot find module '../src/middleware/trustProxy'`.

- [ ] **Step 3: Implement it**

```js
// server/src/middleware/trustProxy.js
// @ts-check

/**
 * Normalises the configured `api.trustProxy` value into what Express expects.
 *
 * Defaults to false. Trusting a forwarded header that nothing sets lets a
 * client claim any address it likes, so the safe default is off and turning it
 * on is a deliberate act by whoever knows the deployment.
 *
 * @param {unknown} value
 * @returns {boolean | number | string}
 */
function resolveTrustProxy(value) {
  if (value === undefined || value === null) return false
  if (typeof value === 'boolean') return value
  if (typeof value === 'number') return value
  if (typeof value === 'string') {
    const asNumber = Number(value)
    return Number.isInteger(asNumber) && value.trim() !== '' ? asNumber : value
  }
  return false
}

module.exports = { resolveTrustProxy }
```

Add `"trustProxy": false` to the `api` block in `config/default.json`, beside `sessionCheckIntervalMs` (`config/default.json:22`).

In `server/src/index.js`, immediately after `const app = express()`:

```js
  app.set('trust proxy', resolveTrustProxy(config.getSafe('api.trustProxy')))
```

with the import beside the other middleware requires:

```js
const { resolveTrustProxy } = require('./middleware/trustProxy')
```

- [ ] **Step 4: Run the test and watch it pass**

Run: `bun test server/test/trustProxy.test.js`
Expected: PASS, 5 tests.

- [ ] **Step 5: Run the whole gate**

Run: `bun test && bun run lint && bun run typecheck`
Expected: all pass.

- [ ] **Step 6: Commit**

```bash
git add server/src/middleware/trustProxy.js server/src/index.js config/default.json server/test/trustProxy.test.js
git commit -m "feat(server): make trust proxy configurable

It was configured nowhere, so behind the reverse proxy that is the normal
deployment req.ip has been the proxy's address and everything derived from
it has been reading the wrong value.

Defaults to false. Trusting a forwarded header nothing sets would let a
client claim any address it likes.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

## What this plan does not do

Recorded so the next plan does not assume otherwise.

- Express stays. Apollo Server 4 mounts as Express middleware, so removing Express while GraphQL still exists would mean building an Apollo-on-Bun.serve integration that gets deleted weeks later. Bun.serve arrives in the tRPC plan, where Apollo goes away anyway.
- Objection and Knex keep serving every map model. Drizzle is introduced only for the auth tables.
- The legacy `users` and `session` tables are left in place and populated. Dropping them is a separate change once the auth tables have run in production long enough to trust.
- Entitlements and the billing API are not built here. The `user_perms` table is shaped to accept them.
- Nothing about the socket, deltas, or revocation cadence. Those need the transport that the tRPC and delta plans build.

---

## Local development setup

Verified working before this plan was executed. An implementer starting fresh needs all of it.

MySQL runs locally with a `reactmap_dev` database and a dedicated user:

```sql
CREATE DATABASE IF NOT EXISTS reactmap_dev CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER IF NOT EXISTS 'reactmap'@'127.0.0.1' IDENTIFIED BY 'reactmap_dev_pw';
GRANT ALL PRIVILEGES ON reactmap_dev.* TO 'reactmap'@'127.0.0.1';
FLUSH PRIVILEGES;
```

Configuration goes in `.env` at the repo root, which is gitignored:

```
REACT_MAP_DB_HOST=127.0.0.1
REACT_MAP_DB_PORT=3306
REACT_MAP_DB_NAME=reactmap_dev
REACT_MAP_DB_USERNAME=reactmap
REACT_MAP_DB_PASSWORD=reactmap_dev_pw
MANUAL_DB_HOST=127.0.0.1
MANUAL_DB_PORT=3306
MANUAL_DB_NAME=reactmap_dev
MANUAL_DB_USERNAME=reactmap
MANUAL_DB_PASSWORD=reactmap_dev_pw
```

Three things about this will waste an hour each if you do not know them up front.

**`config/local.json` does not work for database schemas.** `packages/config/lib/mutations.js:29`
destructures `NODE_CONFIG_DIR` into `[rootConfigDir, serverConfigDir]`, where the root is
`<repo>/config` and the server one is `<repo>/server/src/configs`. Line 57 then guards the env-var
path with `fs.existsSync(path.join(serverConfigDir, 'local.json'))`, checking the directory the file
never lives in. So node-config loads `config/local.json`, and then line 96 resets
`config.database.schemas = []` and rebuilds from environment variables regardless. Use `.env`.

**An empty password silently disables a database.** The guard is a plain `&&` chain over the five
variables, so `REACT_MAP_DB_PASSWORD=` is falsy and the whole schema is skipped with only an
`info`-level log. This is why the dev user above has a password rather than being root.

**`bun run migrate:latest` does not load `.env`.** It shells out to the knex CLI, which never calls
`dotenv.config()`. Export the file into the shell first:

```bash
set -a; . ./.env; set +a
bun run migrate:latest
```

Running the legacy migrations creates `users`, `backups`, `gymBadges`, `nest_submissions` and the
knex bookkeeping tables. Note there is no `session` table: express-mysql-session creates it at
runtime through `createDatabaseTable: true`, so a fresh database will not have one until the server
has run once.
