import { useEffect, useMemo, useState } from 'react'
import { AppShell } from '../components/layout/AppShell'
import { StatCard } from '../components/common/Card'
import { WarningBanner } from '../components/common/WarningBanner'
import { listActiveProjects } from '../lib/repositories/projects'
import { getSettings } from '../lib/repositories/settings'
import { calcConfirmedProfit, calcExpectedProfit } from '../lib/calculations'
import { classifyDueDate, todayISO } from '../lib/dateUtils'
import type { Project } from '../types'

function currentYearMonth(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

function projectLabel(p: Project): string {
  return p.name || '（名称未設定）'
}

export function HomePage() {
  const [projects, setProjects] = useState<Project[]>([])
  const [monthlyGoal, setMonthlyGoal] = useState(30000)

  useEffect(() => {
    let cancelled = false
    listActiveProjects().then((list) => {
      if (!cancelled) setProjects(list)
    })
    getSettings().then((settings) => {
      if (!cancelled) setMonthlyGoal(settings.monthlyGoalAmount)
    })
    return () => {
      cancelled = true
    }
  }, [])

  const thisMonthProjects = useMemo(() => {
    const ym = currentYearMonth()
    return projects.filter((p) => (p.implementationDate ?? '').startsWith(ym))
  }, [projects])

  const money = useMemo(() => {
    const expectedProfit = thisMonthProjects.reduce((sum, p) => sum + (calcExpectedProfit(p) ?? 0), 0)
    const confirmedProfit = thisMonthProjects.reduce((sum, p) => sum + (calcConfirmedProfit(p) ?? 0), 0)
    const outOfPocket = thisMonthProjects.reduce((sum, p) => sum + p.outOfPocketCost, 0)
    return { expectedProfit, confirmedProfit, outOfPocket }
  }, [thisMonthProjects])

  const counts = useMemo(
    () => ({
      waitingApproval: projects.filter((p) => p.status === '承認待ち').length,
      waitingTask: projects.filter((p) => p.status === '追加作業待ち').length,
      inquiring: projects.filter((p) => p.status === '問い合わせ中').length,
      rejected: projects.filter((p) => p.status === '非承認').length,
    }),
    [projects],
  )

  const deadlineWarnings = useMemo(() => {
    const today = todayISO()
    const dueToday: Project[] = []
    const dueSoon3: Project[] = []
    const dueSoon7: Project[] = []
    const overdueApproval: Project[] = []

    for (const p of projects) {
      // 「解約不要」は初期値のため、日付だけ入力して選択肢を変え忘れるケースがある。
      // 見逃しを防ぐため、解約期限が入力されていれば「解約済み」以外は警告の対象にする。
      if (p.cancellationStatus !== '解約済み') {
        const bucket = classifyDueDate(p.cancellationDeadline, today)
        if (bucket === '今日') dueToday.push(p)
        else if (bucket === '3日以内') dueSoon3.push(p)
        else if (bucket === '7日以内') dueSoon7.push(p)
      }
      if (p.status === '承認待ち' && classifyDueDate(p.approvalScheduledDate, today) === '期限超過') {
        overdueApproval.push(p)
      }
    }
    return { dueToday, dueSoon3, dueSoon7, overdueApproval }
  }, [projects])

  const achievementRate = monthlyGoal > 0 ? Math.round((money.confirmedProfit / monthlyGoal) * 100) : 0
  const hasNoWarnings =
    deadlineWarnings.dueToday.length === 0 &&
    deadlineWarnings.overdueApproval.length === 0 &&
    deadlineWarnings.dueSoon3.length === 0 &&
    deadlineWarnings.dueSoon7.length === 0

  return (
    <AppShell title="ホーム" showSettingsGear>
      <div className="space-y-5">
        <section>
          <h2 className="mb-2 text-sm font-bold text-[var(--color-ink-soft)]">今月の利益</h2>
          <div className="grid grid-cols-2 gap-3">
            <StatCard label="見込利益" value={money.expectedProfit.toLocaleString()} unit="円" tone="green" />
            <StatCard label="確定利益" value={money.confirmedProfit.toLocaleString()} unit="円" tone="beige" />
            <StatCard label="手出し総額" value={money.outOfPocket.toLocaleString()} unit="円" />
            <StatCard label="目標達成率" value={`${achievementRate}`} unit="%" />
          </div>
          <div className="mt-2 h-2.5 w-full overflow-hidden rounded-full bg-[var(--color-line)]">
            <div
              className="h-full rounded-full bg-[var(--color-green-dark)]"
              style={{ width: `${Math.min(Math.max(achievementRate, 0), 100)}%` }}
            />
          </div>
          <p className="mt-1 text-xs text-[var(--color-ink-soft)]">
            月間目標 {monthlyGoal.toLocaleString()} 円のうち {money.confirmedProfit.toLocaleString()} 円 達成
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-sm font-bold text-[var(--color-ink-soft)]">案件の状況</h2>
          <div className="grid grid-cols-2 gap-3">
            <StatCard label="承認待ち" value={String(counts.waitingApproval)} unit="件" />
            <StatCard label="追加作業待ち" value={String(counts.waitingTask)} unit="件" />
            <StatCard label="問い合わせ中" value={String(counts.inquiring)} unit="件" />
            <StatCard label="非承認" value={String(counts.rejected)} unit="件" />
          </div>
        </section>

        <section className="space-y-2">
          <h2 className="mb-1 text-sm font-bold text-[var(--color-ink-soft)]">見逃し注意</h2>
          {deadlineWarnings.dueToday.length > 0 && (
            <WarningBanner
              level="danger"
              title={`今日が解約期限の案件が ${deadlineWarnings.dueToday.length} 件あります`}
              description={deadlineWarnings.dueToday.map(projectLabel).join('、')}
            />
          )}
          {deadlineWarnings.overdueApproval.length > 0 && (
            <WarningBanner
              level="danger"
              title={`承認予定日を過ぎている案件が ${deadlineWarnings.overdueApproval.length} 件あります`}
              description={deadlineWarnings.overdueApproval.map(projectLabel).join('、')}
            />
          )}
          {deadlineWarnings.dueSoon3.length > 0 && (
            <WarningBanner
              level="caution"
              title={`3日以内が解約期限の案件が ${deadlineWarnings.dueSoon3.length} 件あります`}
              description={deadlineWarnings.dueSoon3.map(projectLabel).join('、')}
            />
          )}
          {deadlineWarnings.dueSoon7.length > 0 && (
            <WarningBanner
              level="info"
              title={`7日以内が解約期限の案件が ${deadlineWarnings.dueSoon7.length} 件あります`}
              description={deadlineWarnings.dueSoon7.map(projectLabel).join('、')}
            />
          )}
          {hasNoWarnings && <p className="text-sm text-[var(--color-ink-soft)]">今のところ見逃し注意はありません</p>}
        </section>
      </div>
    </AppShell>
  )
}
