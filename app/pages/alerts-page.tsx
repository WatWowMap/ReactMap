import { useState } from 'react'
import { AlertCard } from '../alerts/alert-card'
import { AlertEditor } from '../alerts/alert-editor'
import type { AlertsClient } from '../alerts/alerts-query'
import { useAlerts } from '../alerts/alerts-query'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '../components/ui/sheet'

export interface AlertsPageProps {
  /** Test seam: a fake in place of the default tRPC-backed client. */
  alertsClient?: AlertsClient
}

/**
 * Three states, rendered as three different things -- the design's whole
 * point for this tab. `present` with alerts is the card list; `present`
 * with none says the list is empty, which is a claim about someone's
 * subscriptions; `unreachable` says Poracle is not answering instead,
 * which is a claim about the connection, and the two must never look the
 * same. `absent` and `unconfigured` render nothing here -- `absent`
 * because the nav has already hidden this tab (`bottom-nav.tsx`) and a
 * direct visit has nothing to show either; `unconfigured` because the
 * operator has set no Poracle at all. `loading` renders nothing rather
 * than a placeholder that would flash before the real state lands.
 */
export function AlertsPage({ alertsClient }: AlertsPageProps = {}) {
  const { state, snapshot, replace, remove } = useAlerts(
    alertsClient ? { client: alertsClient } : undefined,
  )

  // Which alert's sheet is open, by uid rather than the row itself, so a
  // save that changes the row's shape (`replace` adopts a new uid) never
  // leaves a stale copy of it on screen -- same reasoning as
  // `filters-page.tsx`'s `openGroupId`.
  const [openUid, setOpenUid] = useState<number | null>(null)
  const openAlert =
    snapshot?.alerts.find((alert) => alert.uid === openUid) ?? null

  if (state === 'loading' || state === 'unconfigured' || state === 'absent') {
    return null
  }

  return (
    <section className="p-6">
      <h1 className="font-display text-2xl font-semibold text-foreground">
        Alerts
      </h1>
      {state === 'unreachable' ? (
        <p className="mt-4 text-sm text-muted-foreground">
          Poracle is unreachable right now. Your alerts will show again once it
          is back.
        </p>
      ) : snapshot && snapshot.alerts.length > 0 ? (
        <div className="mt-4 grid gap-3">
          {snapshot.alerts.map((alert) => (
            <AlertCard
              key={alert.uid}
              alert={alert}
              onOpen={() => setOpenUid(alert.uid)}
              onDelete={() => void remove(alert.uid)}
            />
          ))}
        </div>
      ) : (
        <p className="mt-4 text-sm text-muted-foreground">No alerts yet.</p>
      )}

      {openAlert && (
        // `open` fixed true, mounted only while an alert is open -- the
        // reason `filters-page.tsx`'s sheet does the same: a Radix
        // component whose `open` starts true never has to run the
        // presence transition this project's test setup cannot advance.
        <Sheet
          open
          onOpenChange={(next) => {
            if (!next) setOpenUid(null)
          }}
        >
          <SheetContent side="right" className="gap-4 overflow-y-auto p-6">
            <SheetHeader className="p-0">
              <SheetTitle>Pokémon #{openAlert.pokemonId}</SheetTitle>
            </SheetHeader>
            <AlertEditor
              // Remounted per alert, so the draft never carries from one
              // row to the next.
              key={openAlert.uid}
              alert={openAlert}
              onSave={(patch) => {
                void replace(openAlert.uid, patch)
                setOpenUid(null)
              }}
              onDelete={() => {
                void remove(openAlert.uid)
                setOpenUid(null)
              }}
            />
          </SheetContent>
        </Sheet>
      )}
    </section>
  )
}
