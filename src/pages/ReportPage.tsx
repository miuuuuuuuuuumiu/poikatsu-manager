import { useEffect, useMemo, useState } from 'react'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { AppShell } from '../components/layout/AppShell'
import { Card } from '../components/common/Card'
import { listActiveProjects } from '../lib/repositories/projects'
import { listPointSites } from '../lib/repositories/pointSites'
import { getSettings } from '../lib/repositories/settings'
import { calcConfirmedProfit, formatRateOrDash, formatYenOrDash } from '../lib/calculations'
import {
  annualConfirmedProfit,
  approvalRate,
  availableYears,
  averageApprovalDays,
  monthlyProfits,
  profitByCategory,
  profitBySite,
  projectsInYear,
  rejectedAmount,
  totalOutOfPocket,
} from '../lib/reportAggregations'
import type { PointSite, Project } from '../types'

export function ReportPage() {
  const [projects, setProjects] = useState<Project[]>([])
  const [pointSites, setPointSites] = useState<PointSite[]>([])
  const [monthlyGoal, setMonthlyGoal] = useState(30000)
  const [loading, setLoading] = useState(true)
  const [year, setYear] = useState(() => new Date().getFullYear())

  useEffect(() => {
    let cancelled = false
    Promise.all([listActiveProjects(), listPointSites(), getSettings()]).then(([p, s, settings]) => {
      if (cancelled) return
      setProjects(p)
      setPointSites(s)
      setMonthlyGoal(settings.monthlyGoalAmount)
      setLoading(false)
    })
    return () => {
      cancelled = true
    }
  }, [])

  const years = useMemo(() => availableYears(projects), [projects])
  const yearProjects = useMemo(() => projectsInYear(projects, year), [projects, year])

  const monthly = useMemo(
    () =>
      monthlyProfits(projects, year).map((m) => ({
        month: `${m.month}月`,
        見込利益: m.expectedProfit,
        確定利益: m.confirmedProfit,
      })),
    [projects, year],
  )

  const annualProfit = useMemo(() => annualConfirmedProfit(projects, year), [projects, year])
  const outOfPocket = useMemo(() => totalOutOfPocket(yearProjects), [yearProjects])
  const rejected = useMemo(() => rejectedAmount(yearProjects), [yearProjects])
  const rate = useMemo(() => approvalRate(yearProjects), [yearProjects])
  const avgDays = useMemo(() => averageApprovalDays(yearProjects), [yearProjects])
  const bySite = useMemo(() => profitBySite(yearProjects, pointSites), [yearProjects, pointSites])
  const byCategory = useMemo(() => profitByCategory(yearProjects), [yearProjects])

  const thisMonthGoalRate = useMemo(() => {
    const now = new Date()
    const ym = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
    const confirmed = projects
      .filter((p) => (p.implementationDate ?? '').startsWith(ym))
      .reduce((sum, p) => sum + (calcConfirmedProfit(p) ?? 0), 0)
    return monthlyGoal > 0 ? Math.round((confirmed / monthlyGoal) * 100) : 0
  }, [projects, monthlyGoal])

  return (
    <AppShell title="レポート">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-[var(--color-ink-soft)]">対象年</h2>
          <select
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
            className="rounded-lg border border-[var(--color-line)] bg-[var(--color-surface)] px-3 py-1.5 text-sm font-bold"
          >
            {years.map((y) => (
              <option key={y} value={y}>
                {y}年
              </option>
            ))}
          </select>
        </div>

        {loading ? (
          <p className="text-sm text-[var(--color-ink-soft)]">読み込み中…</p>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3">
              <SummaryStat label="年間利益（確定）" value={formatYenOrDash(annualProfit)} />
              <SummaryStat label="承認率" value={formatRateOrDash(rate)} />
              <SummaryStat label="平均承認日数" value={avgDays == null ? '―' : `${avgDays}日`} />
              <SummaryStat label="非承認金額" value={formatYenOrDash(rejected)} />
              <SummaryStat label="手出し費用（年間）" value={formatYenOrDash(outOfPocket)} />
              <SummaryStat label="対象案件数" value={`${yearProjects.length}件`} />
              <SummaryStat label="今月の目標達成率" value={`${thisMonthGoalRate}%`} />
            </div>

            <Card>
              <p className="mb-2 font-bold">月別の見込利益・確定利益</p>
              <div className="h-56 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={monthly}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-line)" />
                    <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} width={48} />
                    <Tooltip formatter={(v) => `${Number(v).toLocaleString()}円`} />
                    <Bar dataKey="見込利益" fill="var(--color-beige-dark)" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="確定利益" fill="var(--color-green-dark)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>

            <Card>
              <p className="mb-2 font-bold">ポイントサイト別利益</p>
              {bySite.length === 0 ? (
                <p className="text-sm text-[var(--color-ink-soft)]">この年の案件はまだありません</p>
              ) : (
                <ul className="space-y-1 text-sm">
                  {bySite.map((s) => (
                    <li key={s.key} className="flex justify-between">
                      <span>
                        {s.label}
                        <span className="ml-1 text-xs text-[var(--color-ink-soft)]">（{s.count}件）</span>
                      </span>
                      <span className={`font-bold ${s.profit < 0 ? 'text-[var(--color-warn-text)]' : ''}`}>
                        {formatYenOrDash(s.profit)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </Card>

            <Card>
              <p className="mb-2 font-bold">案件カテゴリー別利益</p>
              {byCategory.length === 0 ? (
                <p className="text-sm text-[var(--color-ink-soft)]">この年の案件はまだありません</p>
              ) : (
                <ul className="space-y-1 text-sm">
                  {byCategory.map((c) => (
                    <li key={c.key} className="flex justify-between">
                      <span>
                        {c.label}
                        <span className="ml-1 text-xs text-[var(--color-ink-soft)]">（{c.count}件）</span>
                      </span>
                      <span className={`font-bold ${c.profit < 0 ? 'text-[var(--color-warn-text)]' : ''}`}>
                        {formatYenOrDash(c.profit)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </>
        )}
      </div>
    </AppShell>
  )
}

function SummaryStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-[var(--color-line)] bg-[var(--color-surface)] p-3">
      <p className="text-xs font-bold text-[var(--color-ink-soft)]">{label}</p>
      <p className="mt-0.5 text-xl font-extrabold tabular-nums">{value}</p>
    </div>
  )
}
