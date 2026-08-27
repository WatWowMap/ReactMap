/**
 * The sheet behind one alert card: `RuleSheet` reused exactly as
 * `rule-sheet.tsx`'s module comment says Task 12 would, with Poracle's
 * vocabulary passed in instead of ReactMap's own. No split warning and no
 * exclusion picker -- both are `RuleEditor`'s concerns for a *group* of
 * rules sharing a template, and a Poracle alert is never grouped, it is
 * always exactly one row.
 *
 * `speciesId` is passed as `alert.pokemonId` purely to keep
 * `RuleSheet`'s exclusion widget off: that control renders only for
 * `speciesId === null` ("Any Pokémon"), and an alert's `pokemonId` is
 * never null (`alertRuleShape` requires it), so the widget never appears
 * here regardless.
 */

import { useState } from 'react'
import { Button } from '../components/ui/button'
import type { AlertPatch, AlertRow } from '../rules/poracle-vocabulary'
import { PORACLE_VOCABULARY } from '../rules/poracle-vocabulary'
import { conditionSeeds } from '../rules/rule-conditions'
import { RuleSheet } from '../rules/rule-sheet'

export interface AlertEditorProps {
  alert: AlertRow
  onSave: (patch: AlertPatch) => void
  onDelete: () => void
  /**
   * A draft that has not been written yet.
   *
   * An alert with no conditions matches every spawn of its species, so
   * creating one the moment a species is picked is a notification flood
   * nobody chose. A draft reaches Poracle only when someone presses Save,
   * and until then the destructive action is discarding it rather than
   * deleting something that exists.
   */
  isNew?: boolean
}

export function AlertEditor({
  alert,
  onSave,
  onDelete,
  isNew = false,
}: AlertEditorProps) {
  const [draft, setDraft] = useState<AlertPatch>({})

  return (
    <div className="flex flex-col gap-4">
      <RuleSheet<AlertPatch>
        speciesId={alert.pokemonId}
        vocabulary={PORACLE_VOCABULARY}
        conditions={conditionSeeds(alert, PORACLE_VOCABULARY)}
        onChange={(patch) => setDraft((current) => ({ ...current, ...patch }))}
      />
      <div className="flex items-center justify-between gap-2">
        <Button
          type="button"
          variant={isNew ? 'outline' : 'destructive'}
          onClick={onDelete}
        >
          {isNew ? 'Discard' : 'Delete'}
        </Button>
        <Button type="button" onClick={() => onSave(draft)}>
          Save
        </Button>
      </div>
    </div>
  )
}
