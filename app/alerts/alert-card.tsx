import { Button } from '../components/ui/button'
import { Card, CardHeader, CardTitle } from '../components/ui/card'
import { describeWithVocabulary } from '../rules/condition-vocabulary'
import type { AlertRow } from '../rules/poracle-vocabulary'
import { PORACLE_VOCABULARY } from '../rules/poracle-vocabulary'

export interface AlertCardProps {
  alert: AlertRow
  /** Opens the editing sheet for this alert. */
  onOpen?: () => void
  /** Deletes this alert outright -- no confirmation, matching the design
   *  spec's treatment of a delete that Poracle itself does not undo. */
  onDelete?: () => void
}

/**
 * One Poracle alert. `RuleCard`'s open/act split, not its enabled switch:
 * Poracle's alerts have no per-row enabled column (`poracle-vocabulary.ts`),
 * so there is nothing here for a switch to write, and delete stands in its
 * place as the sibling control outside the open button.
 */
export function AlertCard({ alert, onOpen, onDelete }: AlertCardProps) {
  return (
    <Card data-testid={`alert-${alert.uid}`}>
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <button
            type="button"
            aria-label={`Edit alert for Pokémon #${alert.pokemonId}`}
            className="flex-1 cursor-pointer text-left"
            onClick={onOpen}
          >
            <CardTitle>Pokémon #{alert.pokemonId}</CardTitle>
            <p className="text-muted-foreground text-sm">
              {describeWithVocabulary(alert, PORACLE_VOCABULARY)}
            </p>
          </button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            aria-label={`Delete alert for Pokémon #${alert.pokemonId}`}
            onClick={onDelete}
          >
            Delete
          </Button>
        </div>
      </CardHeader>
    </Card>
  )
}
