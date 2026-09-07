import type { ReactNode } from 'react'
import { Header } from './Header'
import { BottomNav } from './BottomNav'

export function AppShell({
  title,
  showSettingsGear = false,
  children,
}: {
  title: string
  showSettingsGear?: boolean
  children: ReactNode
}) {
  return (
    <div className="mx-auto flex min-h-dvh max-w-xl flex-col bg-[var(--color-base)]">
      <Header title={title} showSettingsGear={showSettingsGear} />
      <main className="page-scroll-area flex-1 px-4 py-4">{children}</main>
      <BottomNav />
    </div>
  )
}
