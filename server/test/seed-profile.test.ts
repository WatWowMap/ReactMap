// server/test/seed-profile.test.ts
//
// Unlike the rest of `server/test`, this file talks to a real MySQL. The
// behaviour under test is almost entirely about what the database does with
// the rows -- the `system` default, the nullability of every `rule_pokemon`
// condition column, and the transaction that keeps a profile from existing
// without its rule -- so a hand-rolled fake would assert the fake rather
// than the schema. It uses the same `REACT_MAP_DB_*` variables the
// acceptance suites do.

import 'dotenv/config'

import { afterAll, beforeAll, expect, test } from 'bun:test'
import { eq, inArray } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/mysql2'
import mysql from 'mysql2/promise'

import {
  createSeedProfileOnSignIn,
  seedProfileForUser,
} from '../src/auth/seed-profile'
import { profile, rule, rulePokemon } from '../src/db/rules-schema'

const USER_IDS = ['user-1', 'user-2', 'user-3']

let pool: import('mysql2/promise').Pool
// The drizzle client is `any` for the same reason `server/src/db/drizzle.ts`
// types its cache that way: two copies of `mysql2` resolve in this tree and
// TS treats their `Pool` types as unrelated.
let db: any

/** Removes every row these three fixture users own, in FK-safe order. */
async function clean() {
  const rules = await db
    .select({ id: rule.id })
    .from(rule)
    .where(inArray(rule.userId, USER_IDS))
  const ruleIds = rules.map((r: { id: number }) => r.id)
  if (ruleIds.length) {
    await db.delete(rulePokemon).where(inArray(rulePokemon.ruleId, ruleIds))
    await db.delete(rule).where(inArray(rule.id, ruleIds))
  }
  await db.delete(profile).where(inArray(profile.userId, USER_IDS))
}

beforeAll(async () => {
  pool = mysql.createPool({
    host: process.env.REACT_MAP_DB_HOST!,
    port: Number(process.env.REACT_MAP_DB_PORT),
    user: process.env.REACT_MAP_DB_USERNAME!,
    password: process.env.REACT_MAP_DB_PASSWORD!,
    database: process.env.REACT_MAP_DB_NAME!,
  })
  db = drizzle(pool)
  await clean()
})

afterAll(async () => {
  await clean()
  await pool.end()
})

test('seeding creates one profile and an Everything rule', async () => {
  await seedProfileForUser(db, 'user-1')
  const profiles = await db
    .select()
    .from(profile)
    .where(eq(profile.userId, 'user-1'))
  expect(profiles).toHaveLength(1)
  expect(profiles[0]?.system).toBe(true)

  const rules = await db.select().from(rule).where(eq(rule.userId, 'user-1'))
  expect(rules.map((r: { name: string }) => r.name)).toEqual(['Everything'])
  expect(rules[0]?.size).toBeNull()
  expect(rules[0]?.glow).toBeNull()
})

test('seeding twice leaves one profile', async () => {
  await seedProfileForUser(db, 'user-2')
  await seedProfileForUser(db, 'user-2')
  const profiles = await db
    .select()
    .from(profile)
    .where(eq(profile.userId, 'user-2'))
  expect(profiles).toHaveLength(1)
})

test('the seeded rule has no conditions, so it matches everything', async () => {
  await seedProfileForUser(db, 'user-3')
  // Filtered to this user's own rule. An unfiltered select would grade
  // whichever row the table happened to return first, and the dev database
  // carries rule rows other suites left behind.
  const rules = await db.select().from(rule).where(eq(rule.userId, 'user-3'))
  expect(rules).toHaveLength(1)
  const [row] = await db
    .select()
    .from(rulePokemon)
    .where(eq(rulePokemon.ruleId, rules[0].id))
  expect(row).toBeDefined()
  for (const [column, value] of Object.entries(row!)) {
    if (column === 'ruleId') continue
    expect(value).toBeNull()
  }
})

test('a seeding failure is logged rather than thrown, so sign-in survives it', async () => {
  const seed = createSeedProfileOnSignIn(() => {
    throw new Error('database unreachable')
  })
  // No assertion beyond "this resolves": the hook runs after the session row
  // already exists, so a throw here would surface as a failed sign-in for a
  // user whose session is in fact perfectly valid.
  expect(await seed('user-4')).toBeUndefined()
})
