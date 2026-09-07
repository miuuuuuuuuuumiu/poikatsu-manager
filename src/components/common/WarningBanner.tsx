import type { ReactNode } from 'react'
import { CheckCircleIcon, InfoIcon, WarningIcon } from '../icons'

type Level = 'danger' | 'caution' | 'info' | 'success'

const STYLES: Record<Level, { bg: string; text: string; icon: (className: string) => ReactNode }> = {
  danger: {
    bg: 'bg-[var(--color-warn-bg)]',
    text: 'text-[var(--color-warn-text)]',
    icon: (c) => <WarningIcon className={c} />,
  },
  caution: {
    bg: 'bg-[var(--color-caution-bg)]',
    text: 'text-[var(--color-caution-text)]',
    icon: (c) => <WarningIcon className={c} />,
  },
  info: {
    bg: 'bg-[var(--color-green)]',
    text: 'text-[var(--color-green-text)]',
    icon: (c) => <InfoIcon className={c} />,
  },
  success: {
    bg: 'bg-[var(--color-green)]',
    text: 'text-[var(--color-green-text)]',
    icon: (c) => <CheckCircleIcon className={c} />,
  },
}

/**
 * 警告・お知らせ表示。色だけに頼らず、アイコンと文字で伝える。
 */
export function WarningBanner({
  level,
  title,
  description,
}: {
  level: Level
  title: string
  description?: string
}) {
  const style = STYLES[level]
  return (
    <div className={`flex items-start gap-2 rounded-xl px-3 py-2.5 ${style.bg} ${style.text}`}>
      {style.icon('h-5 w-5 shrink-0 mt-0.5')}
      <div className="min-w-0">
        <p className="font-bold leading-snug">{title}</p>
        {description && <p className="text-sm leading-snug opacity-90">{description}</p>}
      </div>
    </div>
  )
}
