/**
 * Poracle's own condition vocabulary, read against the same renderer and
 * editor as `REACTMAP_VOCABULARY` -- see the module comment on
 * `condition-vocabulary.ts` for why one descriptor per schema is the point.
 *
 * `AlertRow` here is a client-side mirror of `server/src/services/
 * poracle-view.ts`'s `AlertRow`, not an import of it: `tsconfig.app.json`
 * only includes `app/**`, so the wire is the contract, matching how
 * `rule-types.ts` mirrors the server's `rule` row rather than importing it.
 *
 * No `enabledField`: Poracle's per-alert row has no `enabled` column, its
 * enabled flag lives on the human row instead, so the sheet's on/off
 * switch correctly does not render for this vocabulary.
 *
 * Every optional filter column is `number | null`: Poracle's v2 API
 * projects an unset filter to JSON `null` rather than to its stored
 * sentinel (`pokemonRowToRule`, PoracleNG's `v2_pokemon.go`), and
 * `describeWithVocabulary`'s `?? null` omission logic already does the
 * right thing with that -- an unfiltered alert should say nothing, not
 * "IV 0%, CP 0, ...". `costume` is the one where that nullability decides a
 * rule's meaning rather than its wording: Poracle's wildcard for it is 9000,
 * so `null` is "any costume" and `0` is "no costume" -- two different filters,
 * not two spellings of the same one. `gender` is `string | null`
 * (`'male' | 'female' | 'genderless'`, `null` for "any") rather than a
 * number: Poracle's wire genuinely encodes it as the word, not the int it
 * stores internally, so this is not a type chosen to be different, it is
 * the real one -- and it is also what keeps `RulePatch` (whose `gender` is
 * `number | null`) from becoming assignable into `AlertPatch` now that
 * every other shared column matches `Rule`'s own nullability. See the
 * `@ts-expect-error` in `rule-sheet-vocabulary.test.tsx` this guards.
 */

import {
  LEAGUE_WORD,
  SIZE_RANGE_WORD,
  type Vocabulary,
} from './condition-vocabulary'

/** The client's view of a Poracle alert row, as `alerts.list` returns it. */
export interface AlertRow {
  uid: number
  profileNo: number
  pokemonId: number
  form: number
  costume: number | null
  ping: string
  clean: boolean
  distance: number
  template: string
  overrideLocationLabel: string | null
  ivMin: number | null
  ivMax: number | null
  cpMin: number | null
  cpMax: number | null
  levelMin: number | null
  levelMax: number | null
  atkMin: number | null
  atkMax: number | null
  defMin: number | null
  defMax: number | null
  staMin: number | null
  staMax: number | null
  gender: string | null
  weightMin: number | null
  weightMax: number | null
  minTime: number | null
  rarityMin: number | null
  rarityMax: number | null
  sizeMin: number | null
  sizeMax: number | null
  pvpLeague: number | null
  pvpRankBest: number | null
  pvpRankWorst: number | null
  pvpMinCp: number | null
  pvpCap: number | null
  description: string | null
}

export type AlertPatch = Partial<AlertRow>

/** Renders the number of metres as kilometres: `within 5 km`. Poracle
 *  treats 0 as "use my areas" rather than zero metres. */
function describeDistance(value: number): string | null {
  if (value === 0) return 'within my areas'
  return `within ${value / 1000} km`
}

/** `min_time` is a floor on remaining lifetime, not a range. */
function describeMinTime(value: number): string | null {
  return `at least ${value} seconds left`
}

export const PORACLE_VOCABULARY: Vocabulary<AlertPatch> = {
  id: 'poracle',
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
      key: 'cp',
      label: 'CP',
      minField: 'cpMin',
      maxField: 'cpMax',
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
      kind: 'choice',
      key: 'gender',
      label: 'gender',
      field: 'gender',
      options: [
        { value: 'male', label: 'male' },
        { value: 'female', label: 'female' },
        { value: 'genderless', label: 'genderless' },
      ],
    },
    {
      kind: 'range',
      key: 'size',
      label: 'size',
      minField: 'sizeMin',
      maxField: 'sizeMax',
      words: SIZE_RANGE_WORD,
    },
    {
      kind: 'range',
      key: 'weight',
      label: 'weight',
      minField: 'weightMin',
      maxField: 'weightMax',
    },
    {
      kind: 'value',
      key: 'minTime',
      label: 'time remaining',
      field: 'minTime',
      format: describeMinTime,
    },
    {
      kind: 'range',
      key: 'rarity',
      label: 'rarity',
      minField: 'rarityMin',
      maxField: 'rarityMax',
    },
    {
      kind: 'range',
      key: 'pvp',
      label: 'rank',
      minField: 'pvpRankBest',
      maxField: 'pvpRankWorst',
      labelField: 'pvpLeague',
      labelWords: LEAGUE_WORD,
      floor: 1,
      ceiling: 4096,
      minLabel: 'Best rank',
      maxLabel: 'Worst rank',
    },
    {
      kind: 'value',
      key: 'pvpMinCp',
      label: 'PvP min CP',
      field: 'pvpMinCp',
      format: (value) => `PvP min CP ${value}`,
    },
    {
      kind: 'value',
      key: 'pvpCap',
      label: 'PvP level cap',
      field: 'pvpCap',
      format: (value) => `PvP level cap ${value}`,
    },
  ],
  tail: [
    { kind: 'text', key: 'ping', label: 'ping', field: 'ping' },
    { kind: 'toggle', key: 'clean', label: 'clean', field: 'clean' },
    {
      kind: 'value',
      key: 'distance',
      label: 'distance',
      field: 'distance',
      format: describeDistance,
    },
    { kind: 'text', key: 'template', label: 'template', field: 'template' },
    {
      kind: 'text',
      key: 'overrideLocationLabel',
      label: 'anchored at',
      field: 'overrideLocationLabel',
    },
  ],
}
