// server/src/db/authSchema.ts
import {
  bigint,
  boolean,
  index,
  json,
  mysqlTable,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from 'drizzle-orm/mysql-core'

const authUser = mysqlTable(
  'auth_user',
  {
    id: varchar('id', { length: 36 }).primaryKey(),
    name: varchar('name', { length: 255 }).notNull(),
    email: varchar('email', { length: 255 }).notNull().unique(),
    emailVerified: boolean('email_verified').default(false).notNull(),
    image: text('image'),
    username: varchar('username', { length: 255 }).unique(),
    displayUsername: text('display_username'),
    // Join key back to the legacy `users` row this account was back-filled
    // from. Nullable because users created after the migration have no
    // legacy row. See server/src/auth/backfill.js.
    legacyId: bigint('legacy_id', { mode: 'number' }),
    createdAt: timestamp('created_at', { fsp: 3 }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { fsp: 3 }).defaultNow().notNull(),
  },
  (table) => [index('auth_user_legacy_id_idx').on(table.legacyId)],
)

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
    uniqueIndex('user_perms_user_provider_uidx').on(
      table.userId,
      table.providerId,
    ),
    index('user_perms_user_id_idx').on(table.userId),
  ],
)

export { authAccount, authSession, authUser, authVerification, userPerms }
