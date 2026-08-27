import { Button } from '../components/ui/button'
import { Card, CardHeader, CardTitle } from '../components/ui/card'
import { describeWithVocabulary } from '../rules/condition-vocabulary'
import type { AlertRow } from '../rules/poracle-vocabulary'
import { PORACLE_VOCABULARY } from '../rules/poracle-vocabulary'
import { EMPTY_LOOKUP, type NamesLookup } from '../rules/use-names'

export interface AlertCardProps {
  alert: AlertRow
  /** Opens the editing sheet for this alert. */
  onOpen?: () => void
  /** Deletes this alert outright -- no confirmation, matching the design
   *  spec's treatment of a delete that Poracle itself does not undo. */
  onDelete?: () => void
  /** Names the card's title. Falls back to the bare id when absent. */
  names?: NamesLookup
}

/**
 * One Poracle alert. `RuleCard`'s open/act split, not its enabled switch:
 * Poracle's alerts have no per-row enabled column (`poracle-vocabulary.ts`),
 * so there is nothing here for a switch to write, and delete stands in its
 * place as the sibling control outside the open button.
 */
export function AlertCard({
  alert,
  onOpen,
  onDelete,
  names = EMPTY_LOOKUP,
}: AlertCardProps) {
  const title = names.label(alert.pokemonId, alert.form)

  return (
    <Card data-testid={`alert-${alert.uid}`}>
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <button
            type="button"
            aria-label={`Edit alert for ${title}`}
            className="flex-1 cursor-pointer text-left"
            onClick={onOpen}
          >
            <CardTitle>{title}</CardTitle>
            <p className="text-muted-foreground text-sm">
              {describeWithVocabulary(alert, PORACLE_VOCABULARY)}
            </p>
          </button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            aria-label={`Delete alert for ${title}`}
            onClick={onDelete}
          >
            Delete
          </Button>
        </div>
      </CardHeader>
    </Card>
  )
}
