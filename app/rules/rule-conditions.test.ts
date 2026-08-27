import { expect, test } from 'bun:test'
import { PORACLE_VOCABULARY } from './poracle-vocabulary'
import { conditionSeeds } from './rule-conditions'

test('a stored PvP league comes back as a seed', () => {
  // The editor's PvP block reads its league, and its rank bounds, straight
  // out of the seeded fields. Skipping PvP here left the block rendering
  // against nothing, so an alert with a league stored showed no league
  // selected and two empty rank boxes, while the card beside it described
  // the league correctly from the same row.
  const seeds = conditionSeeds(
    // Poracle names these best/worst rather than min/max: best is the low
    // number. The vocabulary maps best to minField and worst to maxField.
    { pvpLeague: 1500, pvpRankBest: 1, pvpRankWorst: 100 },
    PORACLE_VOCABULARY,
  )
  const pvp = seeds.find((seed) => seed.type === 'pvp')
  expect(pvp).toBeTruthy()
  expect(pvp?.label).toBe(1500)
  expect(pvp?.min).toBe(1)
  expect(pvp?.max).toBe(100)
})

test('no league stored seeds no PvP row', () => {
  const seeds = conditionSeeds({ ivMin: 90 }, PORACLE_VOCABULARY)
  expect(seeds.find((seed) => seed.type === 'pvp')).toBeUndefined()
})

test('a league with no rank bounds still seeds the league', () => {
  // Poracle stores the rank wildcards as their own defaults, so a rule can
  // legitimately name a league and leave the ranks alone.
  const seeds = conditionSeeds({ pvpLeague: 500 }, PORACLE_VOCABULARY)
  const pvp = seeds.find((seed) => seed.type === 'pvp')
  expect(pvp?.label).toBe(500)
  expect(pvp?.min).toBeNull()
  expect(pvp?.max).toBeNull()
})

test('the other conditions still seed as they did', () => {
  const seeds = conditionSeeds(
    { ivMin: 90, ivMax: 100, gender: 1 },
    PORACLE_VOCABULARY,
  )
  expect(seeds.find((seed) => seed.type === 'iv')).toMatchObject({
    min: 90,
    max: 100,
  })
  expect(seeds.find((seed) => seed.type === 'gender')?.value).toBe(1)
})
