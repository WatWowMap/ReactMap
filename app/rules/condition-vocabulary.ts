/**
 * A vocabulary describes a set of columns a rule-shaped row can carry, and
 * `describeWithVocabulary` renders any row against any vocabulary without
 * knowing which schema it is looking at. `REACTMAP_VOCABULARY` is the one
 * ReactMap's own `rule` table uses; Poracle's `monsters` table gets its own
 * (task 9), and both are read by the same renderer here and, eventually,
 * edited by the same `ConditionEditor` (task 8). Keeping the column
 * knowledge in a descriptor rather than in code is what lets a single
 * renderer and a single editor serve two unrelated schemas.
 */

export interface RangeCondition {
  kind: 'range'
  key: string
  label: string
  minField: string
  maxField: string
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
  labelField?: string
  labelWords?: Record<number, string>
}

export interface ChoiceCondition {
  kind: 'choice'
  key: string
  label: string
  field: string
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
export interface ValueCondition {
  kind: 'value'
  key: string
  label: string
  field: string
  /** Renders the whole phrase. Return null to omit the condition. */
  format: (value: number) => string | null
}

/** Truthy renders `label` verbatim: 'ring', 'notifies'. Falsy renders nothing. */
export interface ToggleCondition {
  kind: 'toggle'
  key: string
  label: string
  field: string
}

export interface TextCondition {
  kind: 'text'
  key: string
  label: string
  field: string
}

/** A counted array: '1 exception' / '3 exceptions'. Omitted when empty. */
export interface CountCondition {
  kind: 'count'
  key: string
  field: string
  singular: string
  plural: string
}

export type ConditionDef =
  | RangeCondition
  | ChoiceCondition
  | ToggleCondition
  | TextCondition
  | CountCondition
  | ValueCondition

export interface Vocabulary {
  id: 'reactmap' | 'poracle'
  conditions: ConditionDef[]
  /** Appearance or delivery, rendered after the conditions in the sentence. */
  tail: ConditionDef[]
}

/** Golbat stores a league as its CP cap, so the cap is the league's name. */
const LEAGUE_WORD: Record<number, string> = {
  500: 'Little',
  1500: 'Great',
  2500: 'Ultra',
}

/** 1 = XXS .. 5 = XXL, matching Poracle's size and max_size. */
const SIZE_RANGE_WORD: Record<number, string> = {
  1: 'XXS',
  2: 'XS',
  3: 'M',
  4: 'XL',
  5: 'XXL',
}

export const REACTMAP_VOCABULARY: Vocabulary = {
  id: 'reactmap',
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
