import { cn } from '@app/lib/utils'
import { Bell, Compass, SlidersHorizontal, UserRound } from 'lucide-react'
import { NavLink } from 'react-router'
import type { AlertsClient } from '../alerts/alerts-query'
import { useAlerts } from '../alerts/alerts-query'

const DESTINATIONS = [
  { to: '/map', label: 'Map', icon: Compass },
  { to: '/filters', label: 'Filters', icon: SlidersHorizontal },
  { to: '/alerts', label: 'Alerts', icon: Bell },
  { to: '/profile', label: 'Me', icon: UserRound },
] as const

export interface BottomNavProps {
  /** Test seam: a fake in place of the default tRPC-backed client. */
  alertsClient?: AlertsClient
}

/**
 * Poracle never creates a human on its own -- an account only gets one
 * once the right Discord roles land -- so `absent` and `unconfigured` are
 * not edge cases to grey out, they are "there is no tab here" (see
 * `alerts-page.tsx`'s module comment for the other two states). Reading
 * from the same `useAlerts` hook the page itself reads keeps the nav and
 * the page from ever disagreeing about which is true.
 */
// Tailwind's scanner only picks up class names it can see as literal
// strings, so the column count a hidden Alerts entry leaves behind is
// looked up rather than interpolated (`grid-cols-${n}` would compile to
// nothing). Keyed on how many destinations are actually rendered, not on
// the state, so a future fifth destination does not silently freeze this
// at four and three again.
const GRID_COLS: Record<number, string> = {
  3: 'grid-cols-3',
  4: 'grid-cols-4',
}

export function BottomNav({ alertsClient }: BottomNavProps = {}) {
  const { state } = useAlerts(
    alertsClient ? { client: alertsClient } : undefined,
  )
  const destinations = DESTINATIONS.filter(
    (destination) =>
      destination.to !== '/alerts' ||
      (state !== 'absent' && state !== 'unconfigured'),
  )

  return (
    <nav
      className={cn(
        'fixed inset-x-0 bottom-0 grid border-t border-border-strong bg-surface pb-[env(safe-area-inset-bottom)]',
        GRID_COLS[destinations.length] ?? GRID_COLS[4],
      )}
    >
      {destinations.map(({ to, label, icon: Icon }) => (
        <NavLink
          key={to}
          to={to}
          className={({ isActive }) =>
            cn(
              'flex flex-col items-center gap-1 py-3 text-center text-xs font-medium',
              isActive ? 'text-primary' : 'text-muted-foreground',
            )
          }
        >
          <Icon aria-hidden="true" className="size-5" />
          {label}
        </NavLink>
      ))}
    </nav>
  )
}
