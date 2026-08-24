import { cn } from '@app/lib/utils'
import { Bell, Compass, SlidersHorizontal, UserRound } from 'lucide-react'
import { NavLink } from 'react-router'

const DESTINATIONS = [
  { to: '/map', label: 'Map', icon: Compass },
  { to: '/filters', label: 'Filters', icon: SlidersHorizontal },
  { to: '/alerts', label: 'Alerts', icon: Bell },
  { to: '/profile', label: 'Me', icon: UserRound },
] as const

export function BottomNav() {
  return (
    <nav className="fixed inset-x-0 bottom-0 grid grid-cols-4 border-t border-border-strong bg-surface pb-[env(safe-area-inset-bottom)]">
      {DESTINATIONS.map(({ to, label, icon: Icon }) => (
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
