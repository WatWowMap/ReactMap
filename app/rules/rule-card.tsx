import { Badge } from '../components/ui/badge'
import { Card, CardHeader, CardTitle } from '../components/ui/card'
import { describeRule } from './describe-rule'
import type { RuleGroup } from './rule-types'
import type { NamesLookup } from './use-names'

export interface RuleCardProps {
  group: RuleGroup
  names: NamesLookup
  /** Opens the editing sheet for this group. */
  onOpen?: () => void
}

/**
 * The subject chip is the whole readability idea: a rule card's sentence
 * carries conditions and appearance, never who it targets, so the subject
 * sits beside the name instead. Any Pokémon when the group has no species
 * restriction, the species name when it is exactly one, and a count once
 * it is more -- never "1 Pokémon", which is the one phrasing that makes
 * someone open the card to find out which species that is.
 */
function subjectFor(group: RuleGroup, names: NamesLookup): string {
  if (group.speciesIds.length === 1) {
    const speciesId = group.speciesIds[0] ?? null
    return speciesId === null ? 'Any Pokémon' : names.species(speciesId)
  }
  return `${group.speciesIds.length} Pokémon`
}

/**
 * One grouped rule, as a card in the filters list. The whole card is the
 * affordance -- a real `<button>` around it rather than a click handler on
 * a div, so it is reachable by keyboard and announced as something that
 * can be opened, which is the entire point of a card nobody can edit
 * otherwise.
 */
export function RuleCard({ group, names, onOpen }: RuleCardProps) {
  return (
    <button
      type="button"
      // Named for what the control does rather than left to the card's
      // own text, which is a name and a subject read as one run-on
      // string.
      aria-label={`Edit ${group.name}`}
      className="w-full cursor-pointer text-left"
      onClick={onOpen}
    >
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-2">
            <CardTitle>{group.name}</CardTitle>
            <Badge variant="secondary">{subjectFor(group, names)}</Badge>
          </div>
          {/* The sentence: what the rule asks for and what it does. Every
              member of a group is identical except for its species, so the
              sample describes the whole card. */}
          <p className="text-muted-foreground text-sm">
            {describeRule(group.sample)}
          </p>
        </CardHeader>
      </Card>
    </button>
  )
}
