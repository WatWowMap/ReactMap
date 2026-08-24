import { Card } from '@app/components/ui/card'
import { Bell, Compass, SlidersHorizontal, UserRound } from 'lucide-react'
import { Link } from 'react-router'

const DESTINATIONS = [
  { to: '/map', label: 'Map', icon: Compass },
  { to: '/filters', label: 'Filters', icon: SlidersHorizontal },
  { to: '/alerts', label: 'Alerts', icon: Bell },
  { to: '/profile', label: 'Profile', icon: UserRound },
] as const

export function Hub() {
  return (
    <section className="p-6">
      <h1 className="font-display text-2xl font-semibold text-foreground">
        Hub
      </h1>
      <nav className="mt-4 grid grid-cols-2 gap-3">
        {DESTINATIONS.map(({ to, label, icon: Icon }) => (
          <Link key={to} to={to}>
            <Card className="items-center gap-2 text-center hover:bg-muted/50">
              <Icon aria-hidden="true" className="size-5 text-primary" />
              <span className="text-sm font-medium text-foreground">
                {label}
              </span>
            </Card>
          </Link>
        ))}
      </nav>
    </section>
  )
}
