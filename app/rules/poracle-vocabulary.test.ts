import { expect, test } from 'bun:test'
import { describeWithVocabulary } from './condition-vocabulary'
import { PORACLE_VOCABULARY } from './poracle-vocabulary'

test('an alert reads as a sentence with the delivery tail', () => {
  const row = { ivMin: 100, ivMax: 100, distance: 5000, clean: true }
  const text = describeWithVocabulary(row, PORACLE_VOCABULARY)
  expect(text).toContain('IV 100%')
  expect(text).toContain('within 5 km')
})

test('distance 0 reads as the area subscription, not as zero metres', () => {
  // Poracle treats distance = 0 as "use my areas". Rendering "within 0 km"
  // would be actively wrong.
  expect(describeWithVocabulary({ distance: 0 }, PORACLE_VOCABULARY)).toContain(
    'my areas',
  )
})

test('an unfiltered alert names only the filters that were set', () => {
  // The shape PoracleNG's v2 API actually sends for a bare `!track pikachu`:
  // every optional filter projected to null (`pokemonRowToRule`,
  // `v2_pokemon.go`), never the stored sentinel. `distance: 0` is not a
  // wildcard here -- 0 legitimately means "use my areas", which is why it
  // is the one thing this alert still has to say.
  const unfiltered = {
    ivMin: null,
    ivMax: null,
    cpMin: null,
    cpMax: null,
    levelMin: null,
    levelMax: null,
    atkMin: null,
    atkMax: null,
    defMin: null,
    defMax: null,
    staMin: null,
    staMax: null,
    gender: null,
    weightMin: null,
    weightMax: null,
    minTime: null,
    rarityMin: null,
    rarityMax: null,
    sizeMin: null,
    sizeMax: null,
    pvpLeague: null,
    pvpRankBest: null,
    pvpRankWorst: null,
    pvpMinCp: null,
    pvpCap: null,
    ping: '',
    clean: false,
    distance: 0,
    template: '',
    overrideLocationLabel: null,
  }
  expect(describeWithVocabulary(unfiltered, PORACLE_VOCABULARY)).toBe(
    'within my areas',
  )
})

test('every Poracle-only field has a definition', () => {
  const keys = new Set(
    [...PORACLE_VOCABULARY.conditions, ...PORACLE_VOCABULARY.tail].flatMap(
      (c: any) => [c.field, c.minField, c.maxField].filter(Boolean),
    ),
  )
  for (const field of [
    'ping',
    'clean',
    'distance',
    'template',
    'overrideLocationLabel',
    'weightMin',
    'weightMax',
    'minTime',
    'rarityMin',
    'rarityMax',
    'pvpMinCp',
    'pvpCap',
  ]) {
    expect(keys.has(field)).toBe(true)
  }
})
