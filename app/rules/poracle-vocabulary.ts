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
  costume: number
  ping: string
  clean: boolean
  distance: number
  template: string
  overrideLocationLabel: string | null
  ivMin: number
  ivMax: number
  cpMin: number
  cpMax: number
  levelMin: number
  levelMax: number
  atkMin: number
  atkMax: number
  defMin: number
  defMax: number
  staMin: number
  staMax: number
  gender: number
  weightMin: number
  weightMax: number
  minTime: number
  rarityMin: number
  rarityMax: number
  sizeMin: number
  sizeMax: number
  pvpLeague: number
  pvpRankBest: number
  pvpRankWorst: number
  pvpMinCp: number
  pvpCap: number
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
        { value: 1, label: 'male' },
        { value: 2, label: 'female' },
        { value: 3, label: 'genderless' },
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
