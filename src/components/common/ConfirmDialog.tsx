import { WarningIcon } from '../icons'

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = '削除する',
  cancelLabel = 'キャンセル',
  danger = true,
  onConfirm,
  onCancel,
}: {
  open: boolean
  title: string
  description?: string
  confirmLabel?: string
  cancelLabel?: string
  danger?: boolean
  onConfirm: () => void
  onCancel: () => void
}) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-30 flex items-end justify-center bg-black/40 sm:items-center" role="dialog" aria-modal="true">
      <div className="w-full max-w-sm rounded-t-2xl bg-[var(--color-surface)] p-5 sm:rounded-2xl">
        <div className="mb-2 flex items-center gap-2">
          {danger && <WarningIcon className="h-5 w-5 shrink-0 text-[var(--color-warn-text)]" />}
          <h2 className="text-base font-extrabold">{title}</h2>
        </div>
        {description && <p className="mb-4 text-sm text-[var(--color-ink-soft)]">{description}</p>}
        <div className="flex gap-2">
          <button
            onClick={onCancel}
            className="flex-1 rounded-xl border border-[var(--color-line)] py-2.5 text-sm font-bold text-[var(--color-ink)]"
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            className={`flex-1 rounded-xl py-2.5 text-sm font-bold text-white ${
              danger ? 'bg-[var(--color-warn-text)]' : 'bg-[var(--color-green-dark)]'
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
