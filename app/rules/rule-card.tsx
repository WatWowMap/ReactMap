import { Badge } from '../components/ui/badge'
import { Card, CardHeader, CardTitle } from '../components/ui/card'
import type { RuleGroup } from './rule-types'
import type { NamesLookup } from './use-names'

export interface RuleCardProps {
  group: RuleGroup
  names: NamesLookup
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

/** One grouped rule, as a card in the filters list. Editing opens the sheet (Task 10). */
export function RuleCard({ group, names }: RuleCardProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-2">
          <CardTitle>{group.name}</CardTitle>
          <Badge variant="secondary">{subjectFor(group, names)}</Badge>
        </div>
      </CardHeader>
    </Card>
  )
}
