// 期限が「今日」「3日以内」「7日以内」「期限超過」のどれに当たるかを判定する処理を
// ここに一本化する。ホーム画面・やることリスト・カレンダーで判定がズレないようにするため。

export type DueBucket = '期限超過' | '今日' | '3日以内' | '7日以内' | 'それ以降'

/** 端末のタイムゾーンで「今日」の日付文字列（YYYY-MM-DD）を返す */
export function todayISO(): string {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function daysBetween(fromISO: string, toISO: string): number {
  const from = new Date(`${fromISO}T00:00:00`)
  const to = new Date(`${toISO}T00:00:00`)
  return Math.round((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24))
}

/**
 * 期限日を分類する。期限日が設定されていない場合は null を返す。
 * @param dueDate YYYY-MM-DD形式の期限日
 * @param base 基準日（省略時は今日）。テストのために差し替えられるようにしている。
 */
export function classifyDueDate(dueDate: string | null, base: string = todayISO()): DueBucket | null {
  if (!dueDate) return null
  const diff = daysBetween(base, dueDate)
  if (diff < 0) return '期限超過'
  if (diff === 0) return '今日'
  if (diff <= 3) return '3日以内'
  if (diff <= 7) return '7日以内'
  return 'それ以降'
}

export function isOverdue(dueDate: string | null, base: string = todayISO()): boolean {
  return classifyDueDate(dueDate, base) === '期限超過'
}
