import { Link, useLocation } from 'react-router-dom'
import { CalendarIcon, ChartIcon, HomeIcon, ListIcon, PlusCircleIcon } from '../icons'
import type { ComponentType, SVGProps } from 'react'

const ITEMS: { to: string; label: string; icon: ComponentType<SVGProps<SVGSVGElement>> }[] = [
  { to: '/', label: 'ホーム', icon: HomeIcon },
  { to: '/projects', label: '案件', icon: ListIcon },
  { to: '/projects/new', label: '登録', icon: PlusCircleIcon },
  { to: '/schedule', label: '予定', icon: CalendarIcon },
  { to: '/report', label: 'レポート', icon: ChartIcon },
]

/**
 * 「登録」（/projects/new）と「案件」（/projects 配下）はパスが重なるため、
 * NavLinkの自動判定だけでは両方同時に色が付いてしまう。ここで手動に判定する。
 */
function isItemActive(to: string, pathname: string): boolean {
  if (to === '/') return pathname === '/'
  if (to === '/projects') return pathname === '/projects' || (pathname.startsWith('/projects/') && pathname !== '/projects/new')
  if (to === '/projects/new') return pathname === '/projects/new'
  return pathname === to || pathname.startsWith(`${to}/`)
}

export function BottomNav() {
  const { pathname } = useLocation()

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-20 border-t border-[var(--color-line)] bg-[var(--color-surface)]/95 backdrop-blur"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      aria-label="主要メニュー"
    >
      <ul className="mx-auto flex max-w-xl">
        {ITEMS.map(({ to, label, icon: IconComp }) => {
          const active = isItemActive(to, pathname)
          return (
            <li key={to} className="flex-1">
              <Link
                to={to}
                aria-current={active ? 'page' : undefined}
                className={`flex flex-col items-center gap-0.5 py-2 text-xs font-bold transition-colors ${
                  active ? 'text-[var(--color-green-dark)]' : 'text-[var(--color-ink-soft)]'
                }`}
              >
                <IconComp className="h-6 w-6" />
                {label}
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
