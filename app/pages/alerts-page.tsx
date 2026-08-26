import { AlertCard } from '../alerts/alert-card'
import type { AlertsClient } from '../alerts/alerts-query'
import { useAlerts } from '../alerts/alerts-query'

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
  const { state, snapshot } = useAlerts(
    alertsClient ? { client: alertsClient } : undefined,
  )

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
            <AlertCard key={alert.uid} alert={alert} />
          ))}
        </div>
      ) : (
        <p className="mt-4 text-sm text-muted-foreground">No alerts yet.</p>
      )}
    </section>
  )
}
