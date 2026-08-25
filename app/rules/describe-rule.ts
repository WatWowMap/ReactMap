/**
 * The second line of a rule card: what the rule asks for, and what it does
 * to a marker that matches.
 *
 * The design gives a card a name, a subject and a sentence, and the sentence
 * is the part that lets someone check a filter without opening it:
 *
 *     Hundos                                    Any Pokémon
 *     IV 100% · extra large · gold ring · notifies
 *
 * The subject lives beside the name rather than inside this string, which is
 * what keeps it short when a group covers 25 species. So this describes
 * conditions and appearance only, never which Pokémon.
 *
 * Every rule in a group is identical except for its species, so describing
 * any one member describes the group.
 */

import type { Rule } from './rule-types'

const SIZE_WORD: Record<string, string> = {
  sm: 'small',
  md: 'normal',
  lg: 'large',
  xl: 'extra large',
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

const GENDER_WORD: Record<number, string> = {
  1: 'male',
  2: 'female',
  3: 'genderless',
}

/**
 * A bounded numeric condition as the shortest true phrase: both bounds equal
 * reads as one value, one bound reads as an inequality, both read as a range.
 * An unbounded condition is not mentioned at all.
 */
function range(
  label: string,
  min: number | null,
  max: number | null,
  suffix = '',
): string | null {
  if (min === null && max === null) return null
  if (min !== null && max !== null) {
    if (min === max) return `${label} ${min}${suffix}`
    return `${label} ${min}–${max}${suffix}`
  }
  if (min !== null) return `${label} ${min}${suffix}+`
  return `${label} up to ${max}${suffix}`
}

/**
 * Renders the rule's conditions and appearance, middle-dot separated.
 *
 * A rule with no conditions and no treatment -- the seeded "Everything" --
 * has nothing to list, so it says what it does rather than rendering an
 * empty line.
 */
export function describeRule(rule: Rule): string {
  const parts: (string | null)[] = [
    range('IV', rule.ivMin, rule.ivMax, '%'),
    range('attack', rule.atkMin, rule.atkMax),
    range('defence', rule.defMin, rule.defMax),
    range('stamina', rule.staMin, rule.staMax),
    range('level', rule.levelMin, rule.levelMax),
    range('CP', rule.cpMin, rule.cpMax),
    rule.gender !== null ? (GENDER_WORD[rule.gender] ?? null) : null,
  ]

  if (rule.sizeMin !== null || rule.sizeMax !== null) {
    const low = rule.sizeMin !== null ? SIZE_RANGE_WORD[rule.sizeMin] : null
    const high = rule.sizeMax !== null ? SIZE_RANGE_WORD[rule.sizeMax] : null
    if (low && high)
      parts.push(low === high ? `size ${low}` : `size ${low}–${high}`)
    else if (low) parts.push(`size ${low}+`)
    else if (high) parts.push(`size up to ${high}`)
  }

  // One league per rule, so the league names the rank rather than repeating.
  if (rule.pvpLeague !== null) {
    const league = LEAGUE_WORD[rule.pvpLeague] ?? `${rule.pvpLeague}`
    parts.push(range(`${league} rank`, rule.pvpRankMin, rule.pvpRankMax))
  }

  if (rule.exclusions.length > 0) {
    parts.push(
      rule.exclusions.length === 1
        ? '1 exception'
        : `${rule.exclusions.length} exceptions`,
    )
  }

  if (rule.size) parts.push(SIZE_WORD[rule.size] ?? rule.size)
  if (rule.glow) parts.push('ring')
  if (rule.notify) parts.push('notifies')

  const kept = parts.filter((part): part is string => Boolean(part))
  return kept.length > 0 ? kept.join(' · ') : 'shown normally'
}
