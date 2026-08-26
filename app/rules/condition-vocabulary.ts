/**
 * A vocabulary describes a set of columns a rule-shaped row can carry, and
 * `describeWithVocabulary` renders any row against any vocabulary without
 * knowing which schema it is looking at. `REACTMAP_VOCABULARY` is the one
 * ReactMap's own `rule` table uses; Poracle's `monsters` table gets its own
 * (task 9), and both are read by the same renderer here and, eventually,
 * edited by the same `ConditionEditor` (task 8). Keeping the column
 * knowledge in a descriptor rather than in code is what lets a single
 * renderer and a single editor serve two unrelated schemas.
 *
 * `Vocabulary<P>` is generic over the patch shape its columns belong to --
 * `REACTMAP_VOCABULARY: Vocabulary<RulePatch>`, Poracle's will be
 * `Vocabulary<AlertPatch>` (task 9). Every condition's field/minField/
 * maxField/labelField is typed `keyof P & string` rather than plain
 * `string`, so a typo'd column name is a compile error here, and so a
 * caller cannot pair a vocabulary with an `onChange` typed for a
 * different, unrelated patch -- see `ConditionEditor<P>` and
 * `RuleSheet<P>`, which is what this exists to make possible. The
 * renderer (`describeWithVocabulary`) never needs a specific `P`: it reads
 * an arbitrary `row: Record<string, any>` and stays generic over
 * `ConditionPatch`, the umbrella every concrete patch extends.
 */

import type { RulePatch } from './rules-query'

/**
 * The umbrella every concrete rule/alert patch extends -- wide enough for
 * `RulePatch` (which also carries `boolean` and `number[]` columns) while
 * still forcing every column name declared below to be a real key of it.
 *
 * A patch type only satisfies this constraint if it carries a synthesized
 * index signature, which a plain hand-written `interface` does not -- a
 * `Partial<...>` (or other homomorphic mapped type) over one does. This is
 * not a new rule invented for this file: `RulePatch` is already exactly
 * that shape (`type RulePatch = Partial<Omit<Rule, 'id' | 'speciesId'>>`,
 * `rules-query.ts`). A future `AlertPatch` should follow the same pattern
 * -- `type AlertPatch = Partial<Alert>` -- rather than a plain interface,
 * or `Vocabulary<AlertPatch>` will fail to compile with "index signature
 * for type 'string' is missing", not with an error that names the real
 * cause.
 */
export type ConditionPatch = Record<
  string,
  number | string | boolean | number[] | null
>

export interface RangeCondition<P extends ConditionPatch = ConditionPatch> {
  kind: 'range'
  key: string
  label: string
  minField: keyof P & string
  maxField: keyof P & string
  suffix?: string
  /** Renders a bound as a word instead of a number, e.g. XXS..XXL.
   *  An unmapped bound OMITS the whole condition, matching the old size
   *  range, which fell through its if-chain and pushed nothing. This is the
   *  opposite of `labelWords` below, and the difference is deliberate. */
  words?: Record<number, string>
  /** PvP only. The label prefix is looked up from ANOTHER column's value,
   *  so `pvpLeague: 1500` with `label: 'rank'` renders "Great rank 1-100".
   *  The whole condition is omitted when that column is null, and an
   *  unmapped league falls back to the RAW value (`LEAGUE_WORD[x] ?? x`),
   *  unlike `words` above which omits. */
  labelField?: keyof P & string
  labelWords?: Record<number, string>
}

export interface ChoiceCondition<P extends ConditionPatch = ConditionPatch> {
  kind: 'choice'
  key: string
  label: string
  field: keyof P & string
  /** Renders the matched option's label ALONE, with no `label` prefix:
   *  gender 1 is "male", not "gender male". `value` is a string for
   *  `rule.size`, whose column is 'sm' | 'md' | 'lg' | 'xl'. */
  options: { value: number | string; label: string }[]
  /** What an unmatched value does. The old renderer differed per site and
   *  both behaviours are load-bearing: gender used `?? null` and omitted,
   *  marker size used `?? rule.size` and rendered the raw value. Default
   *  false (omit); marker size sets it true. */
  fallbackToRaw?: boolean
}

/** A single numeric column rendered as a whole phrase. Poracle needs shapes
 *  a range cannot express: `distance` is one int where 0 means "use my
 *  areas" and 5000 means "within 5 km", and `minTime` reads "at least N
 *  seconds left". Without this, Task 9 would have to edit the shared
 *  renderer, which is the second mechanism this design exists to avoid. */
export interface ValueCondition<P extends ConditionPatch = ConditionPatch> {
  kind: 'value'
  key: string
  label: string
  field: keyof P & string
  /** Renders the whole phrase. Return null to omit the condition. */
  format: (value: number) => string | null
}

/** Truthy renders `label` verbatim: 'ring', 'notifies'. Falsy renders nothing. */
export interface ToggleCondition<P extends ConditionPatch = ConditionPatch> {
  kind: 'toggle'
  key: string
  label: string
  field: keyof P & string
}

export interface TextCondition<P extends ConditionPatch = ConditionPatch> {
  kind: 'text'
  key: string
  label: string
  field: keyof P & string
}

/** A counted array: '1 exception' / '3 exceptions'. Omitted when empty. */
export interface CountCondition<P extends ConditionPatch = ConditionPatch> {
  kind: 'count'
  key: string
  field: keyof P & string
  singular: string
  plural: string
}

export type ConditionDef<P extends ConditionPatch = ConditionPatch> =
  | RangeCondition<P>
  | ChoiceCondition<P>
  | ToggleCondition<P>
  | TextCondition<P>
  | CountCondition<P>
  | ValueCondition<P>

export interface Vocabulary<P extends ConditionPatch = ConditionPatch> {
  id: 'reactmap' | 'poracle'
  conditions: ConditionDef<P>[]
  /** Appearance or delivery, rendered after the conditions in the sentence. */
  tail: ConditionDef<P>[]
  /**
   * The column a whole row is switched off with, if the schema has one.
   * ReactMap's `rule` table does; Poracle's `monsters` does not -- its
   * enabled flag is account-level, on the human row, not per alert. The
   * sheet's on/off `Switch` renders only when this is set, so a schema
   * without the column neither shows the control nor is written a field
   * it hasn't got. Typed `keyof P` so naming a column the patch does not
   * carry is a compile error rather than a runtime surprise.
   */
  enabledField?: keyof P & string
}

/** Golbat stores a league as its CP cap, so the cap is the league's name.
 *  Exported: Poracle's own PvP league column (task 9) uses the same words. */
export const LEAGUE_WORD: Record<number, string> = {
  500: 'Little',
  1500: 'Great',
  2500: 'Ultra',
}

/** 1 = XXS .. 5 = XXL, matching Poracle's size and max_size. Exported so
 *  Poracle's vocabulary (task 9) can reuse it for its own size range. */
export const SIZE_RANGE_WORD: Record<number, string> = {
  1: 'XXS',
  2: 'XS',
  3: 'M',
  4: 'XL',
  5: 'XXL',
}

export const REACTMAP_VOCABULARY: Vocabulary<RulePatch> = {
  id: 'reactmap',
  enabledField: 'enabled',
  conditions: [
    {
      kind: 'range',
      key: 'iv',
      label: 'IV',
      minField: 'ivMin',
      maxField: 'ivMax',
      suffix: '%',
    },
    {
      kind: 'range',
      key: 'atk',
      label: 'attack',
      minField: 'atkMin',
      maxField: 'atkMax',
    },
    {
      kind: 'range',
      key: 'def',
      label: 'defence',
      minField: 'defMin',
      maxField: 'defMax',
    },
    {
      kind: 'range',
      key: 'sta',
      label: 'stamina',
      minField: 'staMin',
      maxField: 'staMax',
    },
    {
      kind: 'range',
      key: 'level',
      label: 'level',
      minField: 'levelMin',
      maxField: 'levelMax',
    },
    {
      kind: 'range',
      key: 'cp',
      label: 'CP',
      minField: 'cpMin',
      maxField: 'cpMax',
    },
    {
      kind: 'choice',
      key: 'gender',
      label: 'gender',
      field: 'gender',
      options: [
        { value: 1, label: 'male' },
        { value: 2, label: 'female' },
        { value: 3, label: 'genderless' },
      ],
    },
    {
      kind: 'range',
      key: 'sizeRange',
      label: 'size',
      minField: 'sizeMin',
      maxField: 'sizeMax',
      words: SIZE_RANGE_WORD,
    },
    {
      kind: 'range',
      key: 'pvp',
      label: 'rank',
      minField: 'pvpRankMin',
      maxField: 'pvpRankMax',
      labelField: 'pvpLeague',
      labelWords: LEAGUE_WORD,
    },
    {
      kind: 'count',
      key: 'exclusions',
      field: 'exclusions',
      singular: '1 exception',
      plural: 'exceptions',
    },
  ],
  tail: [
    {
      kind: 'choice',
      key: 'size',
      label: 'size',
      field: 'size',
      options: [
        { value: 'sm', label: 'small' },
        { value: 'md', label: 'normal' },
        { value: 'lg', label: 'large' },
        { value: 'xl', label: 'extra large' },
      ],
      fallbackToRaw: true,
    },
    { kind: 'toggle', key: 'glow', label: 'ring', field: 'glow' },
    { kind: 'toggle', key: 'notify', label: 'notifies', field: 'notify' },
  ],
}

/**
 * A bounded condition as the shortest true phrase: both bounds equal reads
 * as one value, one bound reads as an inequality, both read as a range. An
 * unbounded condition is not mentioned at all.
 */
function range(
  label: string,
  min: number | null,
  max: number | null,
  suffix = '',
  words?: Record<number, string>,
): string | null {
  if (min === null && max === null) return null
  const word = (value: number) => (words ? words[value] : `${value}`)
  if (min !== null && max !== null) {
    if (min === max) return `${label} ${word(min)}${suffix}`
    return `${label} ${word(min)}–${word(max)}${suffix}`
  }
  if (min !== null) return `${label} ${word(min)}${suffix}+`
  return `${label} up to ${word(max as number)}${suffix}`
}

function describeRange(
  row: Record<string, any>,
  def: RangeCondition,
): string | null {
  let label = def.label
  if (def.labelField) {
    const labelValue = row[def.labelField]
    if (labelValue == null) return null
    label = `${def.labelWords?.[labelValue] ?? labelValue} ${def.label}`
  }
  const min = row[def.minField] ?? null
  const max = row[def.maxField] ?? null
  if (def.words) {
    const missingBound =
      (min !== null && !(min in def.words)) ||
      (max !== null && !(max in def.words))
    if (missingBound) return null
  }
  return range(label, min, max, def.suffix ?? '', def.words)
}

function describeChoice(
  row: Record<string, any>,
  def: ChoiceCondition,
): string | null {
  const value = row[def.field]
  if (value == null) return null
  const option = def.options.find((o) => o.value === value)
  if (option) return option.label
  return def.fallbackToRaw ? `${value}` : null
}

function describeToggle(
  row: Record<string, any>,
  def: ToggleCondition,
): string | null {
  return row[def.field] ? def.label : null
}

function describeText(
  row: Record<string, any>,
  def: TextCondition,
): string | null {
  const value = row[def.field]
  return value ? `${def.label} ${value}` : null
}

function describeCount(
  row: Record<string, any>,
  def: CountCondition,
): string | null {
  const value = row[def.field]
  const length = Array.isArray(value) ? value.length : 0
  if (length === 0) return null
  return length === 1 ? def.singular : `${length} ${def.plural}`
}

function describeValue(
  row: Record<string, any>,
  def: ValueCondition,
): string | null {
  const value = row[def.field]
  if (value == null) return null
  return def.format(value)
}

function describeCondition(
  row: Record<string, any>,
  def: ConditionDef,
): string | null {
  switch (def.kind) {
    case 'range':
      return describeRange(row, def)
    case 'choice':
      return describeChoice(row, def)
    case 'toggle':
      return describeToggle(row, def)
    case 'text':
      return describeText(row, def)
    case 'count':
      return describeCount(row, def)
    case 'value':
      return describeValue(row, def)
  }
}

/**
 * Renders a row's conditions and tail, middle-dot separated. A row with
 * nothing to say -- no conditions and no tail treatment -- says what it
 * does rather than rendering an empty line.
 */
export function describeWithVocabulary(
  row: Record<string, any>,
  vocab: Vocabulary,
): string {
  const parts = [...vocab.conditions, ...vocab.tail].map((def) =>
    describeCondition(row, def),
  )
  const kept = parts.filter((part): part is string => Boolean(part))
  return kept.length > 0 ? kept.join(' · ') : 'shown normally'
}
