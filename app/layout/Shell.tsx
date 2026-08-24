import { Outlet } from 'react-router'
import { BottomNav } from './BottomNav'

export function Shell() {
  return (
    <div className="min-h-dvh bg-white font-sans">
      <main className="pb-16">
        <Outlet />
      </main>
      <BottomNav />
    </div>
  )
}
