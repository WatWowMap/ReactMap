import { Badge } from '../components/ui/badge'
import { Card, CardHeader, CardTitle } from '../components/ui/card'
import { Switch } from '../components/ui/switch'
import { describeRule } from './describe-rule'
import type { RuleGroup } from './rule-types'
import type { NamesLookup } from './use-names'

export interface RuleCardProps {
  group: RuleGroup
  names: NamesLookup
  /** Opens the editing sheet for this group. */
  onOpen?: () => void
  /** Switches every rule in the group on or off, to the state passed. */
  onToggle?: (enabled: boolean) => void
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
 * One grouped rule, as a card in the filters list.
 *
 * Two controls, and they are deliberately siblings rather than nested. The
 * open affordance is a real `<button>` wrapping the name, subject and
 * sentence, so the card is reachable by keyboard and announced as
 * something that can be opened; the on/off switch sits outside it, because
 * a switch inside a button is neither valid nor operable.
 *
 * A rule that is off stays in the list, stays readable and stays
 * openable -- hiding it would defeat the point of turning one off instead
 * of deleting it. It is dimmed and says "Off", which is enough to spot at
 * a glance without making the card look broken.
 */
export function RuleCard({ group, names, onOpen, onToggle }: RuleCardProps) {
  const enabled = group.sample.enabled

  return (
    <Card className={enabled ? undefined : 'opacity-60'}>
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <button
            type="button"
            // Named for what the control does rather than left to the
            // card's own text, which is a name and a subject read as one
            // run-on string.
            aria-label={`Edit ${group.name}`}
            className="flex-1 cursor-pointer text-left"
            onClick={onOpen}
          >
            <div className="flex items-center justify-between gap-2">
              <CardTitle>{group.name}</CardTitle>
              <div className="flex items-center gap-1.5">
                {!enabled && <Badge variant="outline">Off</Badge>}
                <Badge variant="secondary">{subjectFor(group, names)}</Badge>
              </div>
            </div>
            {/* The sentence: what the rule asks for and what it does. Every
                member of a group is identical except for its species, so the
                sample describes the whole card. */}
            <p className="text-muted-foreground text-sm">
              {describeRule(group.sample)}
            </p>
          </button>
          <Switch
            aria-label={`${enabled ? 'Disable' : 'Enable'} ${group.name}`}
            checked={enabled}
            onCheckedChange={(next) => onToggle?.(next)}
          />
        </div>
      </CardHeader>
    </Card>
  )
}
