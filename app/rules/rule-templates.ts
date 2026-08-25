/**
 * The four starting points the empty state offers, plus the blank one the
 * page header's "+ New filter" writes.
 *
 * Each is a real rule the moment it is picked, not a preset waiting to be
 * instantiated -- the design spec's empty state is explicit about that:
 * "tapping Great League leaves a card that can be opened and changed". So
 * a template is just the `rules.create` input, and nothing downstream ever
 * learns which one a rule came from.
 */

import type { RuleCreateInput } from './rules-query'

export interface RuleTemplate {
  label: string
  input: RuleCreateInput
}

/** `[null]` is the subject "Any Pokémon" -- see `rules-router.ts`'s `createInput`. */
const ANY_POKEMON: (number | null)[] = [null]

export const BLANK_TEMPLATE: RuleTemplate = {
  label: 'New filter',
  input: { name: 'New filter', speciesIds: ANY_POKEMON },
}

export const STARTING_POINTS: RuleTemplate[] = [
  {
    label: 'Everything',
    input: { name: 'Everything', speciesIds: ANY_POKEMON },
  },
  {
    label: '100% IV',
    input: {
      name: '100% IV',
      speciesIds: ANY_POKEMON,
      ivMin: 100,
      ivMax: 100,
      size: 'xl',
    },
  },
  {
    label: 'Great League',
    input: {
      name: 'Great League',
      speciesIds: ANY_POKEMON,
      pvpLeague: 1500,
      pvpRankMin: 1,
      pvpRankMax: 100,
    },
  },
  {
    label: 'Rare spawns',
    input: { name: 'Rare spawns', speciesIds: ANY_POKEMON, size: 'lg' },
  },
]
