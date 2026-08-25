// server/test/rules-repo.test.ts
//
// Like `seed-profile.test.ts`, this file talks to a real MySQL. Everything
// under test here is what the database does with the rows -- the
// `rules_version` bump landing in the same transaction as the write, a
// too-long name being refused by the column rather than by a hand-rolled
// check, and an UPDATE filtered on `user_id` touching nothing when the id
// belongs to someone else. A fake would assert the fake.
//
// The briefed tests are reproduced as written except for the profile id.
// They pass a literal `1`; a real `profile.id` is auto-increment and a
// profile belongs to exactly one user, so the fixtures below create one
// profile per fixture user and the tests use its real id. `createRules`
// refuses a profile the caller does not own, which is the whole reason the
// literal cannot stand.

import 'dotenv/config'

import { afterAll, beforeAll, beforeEach, expect, test } from 'bun:test'
import { eq, inArray } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/mysql2'
import mysql from 'mysql2/promise'

import {
  profile,
  rule,
  ruleExclusion,
  rulePokemon,
} from '../src/db/rules-schema'
import {
  createRules,
  currentRulesVersion,
  deleteRules,
  listRules,
  updateRules,
} from '../src/services/rules-repo'

// The same twenty-five species the acceptance suite's "rare spawns" card
// holds (server/acceptance/filters.acceptance.ts).
const SPECIES_25 = [
  113, 114, 131, 143, 147, 148, 149, 179, 185, 201, 208, 212, 214, 215, 216,
  225, 227, 236, 237, 238, 239, 240, 241, 246, 248,
]

const USER_IDS = ['u1', 'owner', 'attacker']

let pool: import('mysql2/promise').Pool
// `any` for the reason `server/src/db/drizzle.ts` gives at its own cache:
// two copies of `mysql2` resolve in this tree and TS treats their `Pool`
// types as unrelated.
let db: any
let profileId: number
let ownerProfileId: number

/** Removes every row these fixture users own, in FK-safe order. */
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

/** One profile per fixture user, returning the ids the tests write into. */
async function seedProfiles() {
  const [u1] = await db
    .insert(profile)
    .values({ userId: 'u1', name: 'Default' })
  profileId = u1.insertId
  const [owner] = await db
    .insert(profile)
    .values({ userId: 'owner', name: 'Default' })
  ownerProfileId = owner.insertId
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
  await seedProfiles()
})

afterAll(async () => {
  await clean()
  await pool.end()
})

test('creating a rule for 25 species writes 25 rows', async () => {
  const ids = await createRules(
    db,
    'u1',
    profileId,
    { name: 'Rare', size: 'lg' },
    SPECIES_25,
  )
  expect(ids).toHaveLength(25)
})

test('every write bumps rules_version exactly once', async () => {
  const before = await currentRulesVersion(db, profileId)
  await createRules(db, 'u1', profileId, { name: 'A' }, [null])
  expect(await currentRulesVersion(db, profileId)).toBe(before + 1)
})

test('the bump and the write are one transaction', async () => {
  const before = await currentRulesVersion(db, profileId)
  await expect(
    // too long for the column
    createRules(db, 'u1', profileId, { name: 'x'.repeat(500) }, [null]),
  ).rejects.toThrow()
  expect(await currentRulesVersion(db, profileId)).toBe(before)
})

// The briefed transaction test would also pass with no transaction at all,
// because the bump happens after the inserts. So would a batch that is
// invalid in its `name`, since every row of it fails alike and the first
// insert throws before anything has been written.
//
// This is the half that proves the rollback. The failure has to be
// per-row, so the last species id is one no INT column can hold: the
// twenty-four rows before it insert successfully, and only a real
// transaction takes them back out again.
test('a create that fails partway leaves no rows behind', async () => {
  const speciesIds = [...SPECIES_25.slice(0, 24), 2 ** 40]

  await expect(
    createRules(db, 'u1', profileId, { name: 'Rare' }, speciesIds),
  ).rejects.toThrow()
  expect(await listRules(db, 'u1', profileId)).toEqual([])
})

test('a rule naming a species cannot carry exclusions', async () => {
  await expect(
    createRules(db, 'u1', profileId, { name: 'A', exclusions: [129] }, [147]),
  ).rejects.toThrow(/exclusion/i)
})

test('another user cannot update rules that are not theirs', async () => {
  const [id] = await createRules(db, 'owner', ownerProfileId, { name: 'A' }, [
    null,
  ])
  await expect(
    updateRules(db, 'attacker', [id!], { size: 'xl' }),
  ).rejects.toThrow()
  const [row] = await db.select().from(rule).where(eq(rule.id, id!))
  expect(row?.size).toBeNull()
})

// --- Beyond the brief -------------------------------------------------------
// The brief proves the authorisation hole is closed for `update`. `delete`
// and `create` reach the same tables through the same client, so they get
// the same proof rather than an assumption.

test('another user cannot delete rules that are not theirs', async () => {
  const [id] = await createRules(db, 'owner', ownerProfileId, { name: 'A' }, [
    null,
  ])
  await expect(deleteRules(db, 'attacker', [id!])).rejects.toThrow()
  const rows = await db.select().from(rule).where(eq(rule.id, id!))
  expect(rows).toHaveLength(1)
})

test('a user cannot write rules into a profile that is not theirs', async () => {
  await expect(
    createRules(db, 'attacker', ownerProfileId, { name: 'A' }, [null]),
  ).rejects.toThrow()
  const rows = await db.select().from(rule).where(eq(rule.userId, 'attacker'))
  expect(rows).toHaveLength(0)
})

test('listing returns one flat row per rule, with its exclusions', async () => {
  await createRules(
    db,
    'u1',
    profileId,
    { name: 'Hundos', ivMin: 100, exclusions: [129, 10] },
    [null],
  )
  await createRules(db, 'u1', profileId, { name: 'Rare', size: 'lg' }, [147])

  const rows = await listRules(db, 'u1', profileId)
  expect(rows.map((r) => r.name)).toEqual(['Hundos', 'Rare'])

  const [hundos, rare] = rows
  expect(hundos?.ivMin).toBe(100)
  expect(hundos?.speciesId).toBeNull()
  expect(hundos?.exclusions.sort((a, b) => a - b)).toEqual([10, 129])
  expect(rare?.speciesId).toBe(147)
  expect(rare?.size).toBe('lg')
  expect(rare?.exclusions).toEqual([])
})

test('listing never returns another user rules', async () => {
  await createRules(db, 'owner', ownerProfileId, { name: 'Theirs' }, [null])
  expect(await listRules(db, 'u1', profileId)).toEqual([])
})

test('updating patches the rule and its conditions together', async () => {
  const [id] = await createRules(db, 'u1', profileId, { name: 'A' }, [147])
  await updateRules(db, 'u1', [id!], { size: 'xl', ivMin: 90 })

  const [row] = await listRules(db, 'u1', profileId)
  expect(row?.size).toBe('xl')
  expect(row?.ivMin).toBe(90)
  expect(row?.name).toBe('A')
})

test('deleting a rule takes its conditions and exclusions with it', async () => {
  const ids = await createRules(
    db,
    'u1',
    profileId,
    { name: 'A', exclusions: [129] },
    [null],
  )
  await deleteRules(db, 'u1', ids)

  expect(await listRules(db, 'u1', profileId)).toEqual([])
  expect(
    await db.select().from(rulePokemon).where(inArray(rulePokemon.ruleId, ids)),
  ).toEqual([])
  expect(
    await db
      .select()
      .from(ruleExclusion)
      .where(inArray(ruleExclusion.ruleId, ids)),
  ).toEqual([])
})

test('an update and a delete each bump rules_version once', async () => {
  const ids = await createRules(db, 'u1', profileId, { name: 'A' }, [null])

  const beforeUpdate = await currentRulesVersion(db, profileId)
  await updateRules(db, 'u1', ids, { size: 'xl' })
  expect(await currentRulesVersion(db, profileId)).toBe(beforeUpdate + 1)

  const beforeDelete = await currentRulesVersion(db, profileId)
  await deleteRules(db, 'u1', ids)
  expect(await currentRulesVersion(db, profileId)).toBe(beforeDelete + 1)
})

test('a refused update leaves rules_version alone', async () => {
  const [id] = await createRules(db, 'owner', ownerProfileId, { name: 'A' }, [
    null,
  ])
  const before = await currentRulesVersion(db, ownerProfileId)
  await expect(
    updateRules(db, 'attacker', [id!], { size: 'xl' }),
  ).rejects.toThrow()
  expect(await currentRulesVersion(db, ownerProfileId)).toBe(before)
})

// `updateInput.patch` accepts `exclusions`, so the repository has to honour
// it. It used to drop the field silently: the exclusion list a client had
// just saved was never written and no error said so.

test('updating replaces the exclusion list, and an empty list clears it', async () => {
  const ids = await createRules(
    db,
    'u1',
    profileId,
    { name: 'Hundos', exclusions: [129] },
    [null],
  )

  await updateRules(db, 'u1', ids, { exclusions: [10, 20] })
  const [replaced] = await listRules(db, 'u1', profileId)
  expect(replaced?.exclusions.sort((a, b) => a - b)).toEqual([10, 20])

  await updateRules(db, 'u1', ids, { exclusions: [] })
  const [cleared] = await listRules(db, 'u1', profileId)
  expect(cleared?.exclusions).toEqual([])
})

test('an update cannot add an exclusion to a rule that names a species', async () => {
  const ids = await createRules(db, 'u1', profileId, { name: 'Rare' }, [147])
  await expect(
    updateRules(db, 'u1', ids, { exclusions: [129] }),
  ).rejects.toThrow(/exclusion/i)
})
