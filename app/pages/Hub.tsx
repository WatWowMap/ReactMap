import { Link } from 'react-router'

const DESTINATIONS = [
  { to: '/map', label: 'Map' },
  { to: '/filters', label: 'Filters' },
  { to: '/alerts', label: 'Alerts' },
  { to: '/profile', label: 'Profile' },
] as const

export function Hub() {
  return (
    <section className="p-6">
      <h1 className="text-2xl font-semibold">Hub</h1>
      <nav className="mt-4 grid grid-cols-2 gap-3">
        {DESTINATIONS.map(({ to, label }) => (
          <Link
            key={to}
            to={to}
            className="rounded-lg border border-neutral-200 p-4 text-center text-sm font-medium"
          >
            {label}
          </Link>
        ))}
      </nav>
    </section>
  )
}
