import { Link } from 'react-router-dom'
import { GearIcon } from '../icons'

export function Header({ title, showSettingsGear = false }: { title: string; showSettingsGear?: boolean }) {
  return (
    <header
      className="sticky top-0 z-10 flex items-center justify-between border-b border-[var(--color-line)] bg-[var(--color-base)]/95 px-4 backdrop-blur"
      style={{ paddingTop: 'env(safe-area-inset-top)' }}
    >
      <h1 className="py-3 text-lg font-extrabold text-[var(--color-ink)]">{title}</h1>
      {showSettingsGear && (
        <Link
          to="/settings"
          aria-label="設定を開く"
          className="flex h-10 w-10 items-center justify-center rounded-full text-[var(--color-ink-soft)] hover:bg-[var(--color-beige)]"
        >
          <GearIcon className="h-6 w-6" />
        </Link>
      )}
    </header>
  )
}
