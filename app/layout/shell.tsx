import { Outlet } from 'react-router'
import { BottomNav } from './bottom-nav'

export function Shell() {
  return (
    <div className="min-h-dvh bg-surface font-sans text-foreground">
      <main className="pb-16">
        <Outlet />
      </main>
      <BottomNav />
    </div>
  )
}
