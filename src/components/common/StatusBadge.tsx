import type { CancellationStatus, ProjectStatus } from '../../types'

const PROJECT_STATUS_STYLE: Record<ProjectStatus, string> = {
  下書き: 'bg-gray-100 text-gray-600',
  申込済み: 'bg-[var(--color-green)] text-[var(--color-green-text)]',
  追加作業待ち: 'bg-[var(--color-caution-bg)] text-[var(--color-caution-text)]',
  通帳反映待ち: 'bg-[var(--color-caution-bg)] text-[var(--color-caution-text)]',
  承認待ち: 'bg-[var(--color-caution-bg)] text-[var(--color-caution-text)]',
  付与済み: 'bg-[var(--color-green-dark)] text-white',
  非承認: 'bg-[var(--color-warn-bg)] text-[var(--color-warn-text)]',
  問い合わせ中: 'bg-[var(--color-beige)] text-[var(--color-ink)]',
  完了: 'bg-[var(--color-green-dark)] text-white',
}

const CANCELLATION_STATUS_STYLE: Record<CancellationStatus, string> = {
  解約不要: 'bg-gray-100 text-gray-500',
  未解約: 'bg-[var(--color-caution-bg)] text-[var(--color-caution-text)]',
  解約予約済み: 'bg-[var(--color-green)] text-[var(--color-green-text)]',
  解約済み: 'bg-[var(--color-green-dark)] text-white',
}

export function ProjectStatusBadge({ status }: { status: ProjectStatus }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-bold ${PROJECT_STATUS_STYLE[status]}`}>
      {status}
    </span>
  )
}

export function CancellationStatusBadge({ status }: { status: CancellationStatus }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-bold ${CANCELLATION_STATUS_STYLE[status]}`}>
      {status}
    </span>
  )
}
