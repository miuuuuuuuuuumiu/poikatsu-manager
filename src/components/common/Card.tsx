import type { ReactNode } from 'react'

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div className={`rounded-2xl bg-[var(--color-surface)] border border-[var(--color-line)] shadow-sm p-4 ${className}`}>
      {children}
    </div>
  )
}

/** ホーム画面の大きな数字カード */
export function StatCard({
  label,
  value,
  unit,
  tone = 'default',
}: {
  label: string
  value: string
  unit?: string
  tone?: 'default' | 'green' | 'beige'
}) {
  const toneClass =
    tone === 'green'
      ? 'bg-[var(--color-green)]'
      : tone === 'beige'
        ? 'bg-[var(--color-beige)]'
        : 'bg-[var(--color-surface)] border border-[var(--color-line)]'

  return (
    <div className={`rounded-2xl p-4 ${toneClass}`}>
      <p className="text-sm font-bold text-[var(--color-ink-soft)]">{label}</p>
      <p className="mt-1 flex items-baseline gap-1">
        <span className="text-3xl font-extrabold tabular-nums text-[var(--color-ink)]">{value}</span>
        {unit && <span className="text-sm font-bold text-[var(--color-ink-soft)]">{unit}</span>}
      </p>
    </div>
  )
}
