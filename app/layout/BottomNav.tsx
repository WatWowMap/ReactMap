import { NavLink } from 'react-router'

const DESTINATIONS = [
  { to: '/map', label: 'Map' },
  { to: '/filters', label: 'Filters' },
  { to: '/alerts', label: 'Alerts' },
  { to: '/profile', label: 'Me' },
] as const

export function BottomNav() {
  return (
    <nav className="fixed inset-x-0 bottom-0 grid grid-cols-4 border-t border-neutral-200 bg-white pb-[env(safe-area-inset-bottom)]">
      {DESTINATIONS.map(({ to, label }) => (
        <NavLink
          key={to}
          to={to}
          className={({ isActive }) =>
            `py-3 text-center text-sm ${isActive ? 'text-violet-600' : 'text-neutral-500'}`
          }
        >
          {label}
        </NavLink>
      ))}
    </nav>
  )
}
