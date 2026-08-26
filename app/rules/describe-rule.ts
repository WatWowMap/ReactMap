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
 *
 * The column knowledge that used to live here now lives in
 * `REACTMAP_VOCABULARY` (`condition-vocabulary.ts`), so the same renderer
 * can also describe Poracle's monster rows against their own vocabulary.
 */

import {
  describeWithVocabulary,
  REACTMAP_VOCABULARY,
} from './condition-vocabulary'
import type { Rule } from './rule-types'

export function describeRule(rule: Rule): string {
  return describeWithVocabulary(
    rule as unknown as Record<string, any>,
    REACTMAP_VOCABULARY,
  )
}
