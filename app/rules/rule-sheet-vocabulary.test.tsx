/**
 * `rule-sheet.test.tsx` is locked -- it fixes the sheet's behaviour for
 * ReactMap's own rules and must keep passing byte-for-byte. This file
 * covers the other schema: what the sheet does when the vocabulary it is
 * given describes a row that is not a ReactMap rule.
 *
 * The test below is compile-time, not runtime. A `@ts-expect-error` fails
 * typecheck when the error it expects stops happening, so it is a live
 * guard on a type hole that was open before: deleting the signature that
 * closes it turns the comment into an unused-directive error.
 */

import { expect, test } from 'bun:test'
import { RuleSheet } from './rule-sheet'

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
