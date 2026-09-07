import type { SaveStatus } from '../../hooks/useAutosave'
import { CheckCircleIcon, WarningIcon } from '../icons'

export function SaveStatusIndicator({ status, errorMessage }: { status: SaveStatus; errorMessage?: string }) {
  if (status === 'idle') {
    return <p className="text-xs text-[var(--color-ink-soft)]">まだ変更はありません</p>
  }
  if (status === 'saving') {
    return (
      <p className="flex items-center gap-1.5 text-xs font-bold text-[var(--color-ink-soft)]">
        <span className="h-3 w-3 animate-spin rounded-full border-2 border-[var(--color-ink-soft)] border-t-transparent" />
        保存中…
      </p>
    )
  }
  if (status === 'error') {
    return (
      <p className="flex items-center gap-1.5 text-xs font-bold text-[var(--color-warn-text)]">
        <WarningIcon className="h-4 w-4 shrink-0" />
        保存に失敗しました{errorMessage ? `（${errorMessage}）` : ''}
      </p>
    )
  }
  return (
    <p className="flex items-center gap-1.5 text-xs font-bold text-[var(--color-green-text)]">
      <CheckCircleIcon className="h-4 w-4 shrink-0" />
      保存済み
    </p>
  )
}
