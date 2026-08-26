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
