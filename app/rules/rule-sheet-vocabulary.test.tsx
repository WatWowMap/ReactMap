/**
 * `rule-sheet.test.tsx` is locked -- it fixes the sheet's behaviour for
 * ReactMap's own rules and must keep passing byte-for-byte. This file
 * covers the other schema: what the sheet does when the vocabulary it is
 * given describes a row that is not a ReactMap rule.
 *
 * Two of these tests are compile-time, not runtime. A `@ts-expect-error`
 * fails typecheck when the error it expects stops happening, so each one
 * is a live guard on a type hole that was open before: deleting the
 * signature or the `keyof P` that closes it turns the comment into an
 * unused-directive error.
 */

import { afterAll, afterEach, beforeAll, expect, test } from 'bun:test'
import { cleanup, render } from '@testing-library/react'
import { setupDom, teardownDom } from '../test-setup'
import type { Vocabulary } from './condition-vocabulary'
import { RuleSheet } from './rule-sheet'

beforeAll(setupDom)
afterAll(teardownDom)
afterEach(cleanup)

/** Poracle's `monsters` row, as task 5's `AlertRow` already ships it: no
 *  per-alert enabled column, because its enabled flag is account-level. */
interface AlertRow {
  uid: number
  ping: string
  distance: number
  weightMin: number
  weightMax: number
}
type AlertPatch = Partial<AlertRow>

const PORACLE_VOCABULARY: Vocabulary<AlertPatch> = {
  id: 'poracle',
  conditions: [
    {
      kind: 'range',
      key: 'weight',
      label: 'weight',
      minField: 'weightMin',
      maxField: 'weightMax',
    },
  ],
  tail: [],
}

test('a vocabulary without an enabled column gets no on/off switch', () => {
  const { queryByRole } = render(
    <RuleSheet
      speciesId={147}
      vocabulary={PORACLE_VOCABULARY}
      onChange={(patch: AlertPatch) => patch}
    />,
  )
  // Poracle's enabled flag lives on the human row, not the alert, so a
  // switch here would write a column the alert hasn't got.
  expect(queryByRole('switch')).toBeNull()
})

test('a sheet with a foreign onChange and no vocabulary does not compile', () => {
  // Omitting `vocabulary` pins the patch type to ReactMap's `RulePatch`.
  // This used to infer `P` from `onChange` alone and hand back a rule
  // patch labelled as an alert patch.
  const bad = (
    // @ts-expect-error
    <RuleSheet speciesId={null} onChange={(patch: AlertPatch) => patch} />
  )
  expect(bad).toBeTruthy()
})

test('a vocabulary cannot name an enabled column its patch has not got', () => {
  const bad: Vocabulary<AlertPatch> = {
    id: 'poracle',
    // @ts-expect-error
    enabledField: 'enabled',
    conditions: [],
    tail: [],
  }
  expect(bad.id).toBe('poracle')
})
