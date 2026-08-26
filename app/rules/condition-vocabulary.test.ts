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

test('an unmapped gender omits the whole condition, not the raw value', () => {
  expect(describeWithVocabulary({ gender: 9 }, REACTMAP_VOCABULARY)).toBe(
    'shown normally',
  )
})

test('an unmapped marker size renders the raw value', () => {
  expect(describeWithVocabulary({ size: 'huge' }, REACTMAP_VOCABULARY)).toBe(
    'huge',
  )
})

test('an unmapped size bound omits the whole condition, not the raw number', () => {
  expect(describeWithVocabulary({ sizeMin: 6 }, REACTMAP_VOCABULARY)).toBe(
    'shown normally',
  )
})

test('an unmapped league falls back to the raw value', () => {
  expect(
    describeWithVocabulary(
      { pvpLeague: 9999, pvpRankMin: 1, pvpRankMax: 5 },
      REACTMAP_VOCABULARY,
    ),
  ).toBe('9999 rank 1–5')
})

test('a value condition renders a whole phrase from a single field', () => {
  const vocab = {
    id: 'poracle' as const,
    conditions: [
      {
        kind: 'value' as const,
        key: 'distance',
        label: 'distance',
        field: 'distance',
        format: (value: number) =>
          value === 0 ? null : `within ${value / 1000} km`,
      },
    ],
    tail: [],
  }
  expect(describeWithVocabulary({ distance: 5000 }, vocab)).toBe('within 5 km')
})

test('a value condition omits the condition when format returns null', () => {
  const vocab = {
    id: 'poracle' as const,
    conditions: [
      {
        kind: 'value' as const,
        key: 'distance',
        label: 'distance',
        field: 'distance',
        format: (value: number) =>
          value === 0 ? null : `within ${value / 1000} km`,
      },
    ],
    tail: [],
  }
  expect(describeWithVocabulary({ distance: 0 }, vocab)).toBe('shown normally')
})
