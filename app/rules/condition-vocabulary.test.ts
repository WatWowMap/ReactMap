import { expect, test } from 'bun:test'
import {
  describeWithVocabulary,
  REACTMAP_VOCABULARY,
} from './condition-vocabulary'

test('equal bounds read as one value', () => {
  const row = { ivMin: 100, ivMax: 100 }
  expect(describeWithVocabulary(row, REACTMAP_VOCABULARY)).toBe('IV 100%')
})

test('an unbounded condition is not mentioned', () => {
  expect(describeWithVocabulary({ size: 'lg' }, REACTMAP_VOCABULARY)).toBe(
    'large',
  )
})

test('a vocabulary with no matching fields says what it does', () => {
  expect(describeWithVocabulary({}, REACTMAP_VOCABULARY)).toBe('shown normally')
})

test("a foreign vocabulary renders its own fields and none of ReactMap's", () => {
  // The refactor's whole purpose: the renderer must not know which schema
  // it is looking at.
  const vocab = {
    id: 'poracle' as const,
    conditions: [
      {
        kind: 'range' as const,
        key: 'weight',
        label: 'weight',
        minField: 'weightMin',
        maxField: 'weightMax',
      },
    ],
    tail: [],
  }
  expect(
    describeWithVocabulary({ weightMin: 5, weightMax: 5, ivMin: 100 }, vocab),
  ).toBe('weight 5')
})
