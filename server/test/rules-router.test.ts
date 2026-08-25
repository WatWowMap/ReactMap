// server/test/rules-router.test.ts
//
// The `rules.*` procedures through a real caller and a real database. The
// repository already has its own tests; what this file exists for is the
// layer above them -- that a procedure takes its user from the session and
// its profile from the database, and that neither can be talked out of the
// input. The full end-to-end path (a browser cookie, an HTTP request) is
// the acceptance suite's job.

import 'dotenv/config'

import { afterAll, beforeAll, beforeEach, expect, test } from 'bun:test'
import { inArray } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/mysql2'
import mysql from 'mysql2/promise'

import {
  profile,
  rule,
  ruleExclusion,
  rulePokemon,
} from '../src/db/rules-schema'
import { appRouter } from '../src/trpc/router'
import { t } from '../src/trpc/trpc-base'

const USER_IDS = ['router-u1', 'router-u2']

let pool: import('mysql2/promise').Pool
// `any` for the reason `server/src/db/drizzle.ts` gives at its own cache.
let db: any

const createCaller = t.createCallerFactory(appRouter)

/** A caller signed in as `userId`, or as nobody when it is null. */
function callerFor(userId: string | null) {
  return createCaller({
    user: userId ? { id: userId } : null,
    session: userId ? { userId } : null,
    golbatClient: null,
    db,
  })
}

async function clean() {
  const rules = await db
    .select({ id: rule.id })
    .from(rule)
    .where(inArray(rule.userId, USER_IDS))
  const ruleIds = rules.map((r: { id: number }) => r.id)
  if (ruleIds.length) {
    await db.delete(ruleExclusion).where(inArray(ruleExclusion.ruleId, ruleIds))
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
})

beforeEach(async () => {
  await clean()
  for (const userId of USER_IDS) {
    await db.insert(profile).values({ userId, name: 'Default' })
  }
})

afterAll(async () => {
  await clean()
  await pool.end()
})

test('a signed-out caller cannot read or write rules', async () => {
  const anon = callerFor(null)
  await expect(anon.rules.list()).rejects.toThrow(/sign in/i)
  await expect(
    anon.rules.create({ name: 'A', speciesIds: [null] }),
  ).rejects.toThrow(/sign in/i)
})

test('create resolves the profile server-side and list reads it back', async () => {
  const caller = callerFor('router-u1')
  const { ids } = await caller.rules.create({
    name: 'Rare spawns',
    size: 'lg',
    speciesIds: [147, 246],
  })
  expect(ids).toHaveLength(2)

  const rows = await caller.rules.list()
  expect(rows.map((r) => r.name)).toEqual(['Rare spawns', 'Rare spawns'])
  expect(rows.map((r) => r.speciesId)).toEqual([147, 246])
})

test('a user id in the body is ignored: the session decides', async () => {
  const caller = callerFor('router-u1')
  // `userId` is not part of the input schema. Zod strips it, and even if it
  // did not, no procedure reads a user id from its input.
  await caller.rules.create({
    name: 'Mine',
    speciesIds: [null],
    ...({ userId: 'router-u2' } as unknown as Record<string, never>),
  })
  expect(await callerFor('router-u2').rules.list()).toEqual([])
  expect((await caller.rules.list()).map((r) => r.name)).toEqual(['Mine'])
})

test('one caller cannot update or delete another caller rules', async () => {
  const owner = callerFor('router-u1')
  const { ids } = await owner.rules.create({ name: 'A', speciesIds: [null] })

  const attacker = callerFor('router-u2')
  await expect(
    attacker.rules.update({ ruleIds: ids, patch: { size: 'xl' } }),
  ).rejects.toThrow()
  await expect(attacker.rules.delete({ ruleIds: ids })).rejects.toThrow()

  const [row] = await owner.rules.list()
  expect(row?.size).toBeNull()
})

test('a rule naming a species is refused its exclusions at the RPC edge', async () => {
  const caller = callerFor('router-u1')
  await expect(
    caller.rules.create({ name: 'Bad', speciesIds: [147], exclusions: [129] }),
  ).rejects.toThrow(/exclusion/i)

  const ok = await caller.rules.create({
    name: 'Good',
    speciesIds: [null],
    exclusions: [129],
  })
  expect(ok.ids).toHaveLength(1)
})

test('update patches only the rules it names', async () => {
  const caller = callerFor('router-u1')
  const { ids } = await caller.rules.create({
    name: 'Rare spawns',
    size: 'lg',
    speciesIds: [147, 246],
  })
  await caller.rules.update({ ruleIds: [ids[1]!], patch: { size: 'xl' } })

  const rows = await caller.rules.list()
  expect(rows.map((r) => r.size)).toEqual(['lg', 'xl'])
})

test('delete removes the rules it names and leaves the rest', async () => {
  const caller = callerFor('router-u1')
  const { ids } = await caller.rules.create({
    name: 'Rare spawns',
    speciesIds: [147, 246],
  })
  await caller.rules.delete({ ruleIds: [ids[0]!] })

  const rows = await caller.rules.list()
  expect(rows.map((r) => r.speciesId)).toEqual([246])
})
