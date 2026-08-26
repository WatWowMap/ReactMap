import { Card, CardHeader, CardTitle } from '../components/ui/card'
import { describeWithVocabulary } from '../rules/condition-vocabulary'
import type { AlertRow } from '../rules/poracle-vocabulary'
import { PORACLE_VOCABULARY } from '../rules/poracle-vocabulary'

export interface AlertCardProps {
  alert: AlertRow
}

/**
 * One Poracle alert. Read-only -- Task 10 is the read side of the Alerts
 * tab, editing is a later task -- so this is `RuleCard` with the button
 * and switch stripped out: a title and the same kind of sentence, rendered
 * through the shared renderer (`describeWithVocabulary`) against Poracle's
 * own vocabulary rather than ReactMap's.
 */
export function AlertCard({ alert }: AlertCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Pokémon #{alert.pokemonId}</CardTitle>
        <p className="text-muted-foreground text-sm">
          {describeWithVocabulary(alert, PORACLE_VOCABULARY)}
        </p>
      </CardHeader>
    </Card>
  )
}
