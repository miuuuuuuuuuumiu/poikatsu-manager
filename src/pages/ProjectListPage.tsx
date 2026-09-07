import { useEffect, useMemo, useState } from 'react'
import { AppShell } from '../components/layout/AppShell'
import { Card } from '../components/common/Card'
import { ProjectStatusBadge } from '../components/common/StatusBadge'
import { ListIcon, PlusCircleIcon, SearchIcon } from '../components/icons'
import { Link } from 'react-router-dom'
import type { PointSite, Project, ProjectStatus } from '../types'
import { PROJECT_STATUSES } from '../types'
import { listActiveProjects } from '../lib/repositories/projects'
import { listPointSites } from '../lib/repositories/pointSites'
import { calcConfirmedProfit, calcExpectedProfit, formatYenOrDash } from '../lib/calculations'

type SortKey = 'updatedDesc' | 'implementationDesc' | 'profitDesc'

/** 一覧に表示する利益：確定していればそちらを優先し、なければ見込利益を使う */
function displayProfit(project: Project): number | null {
  return calcConfirmedProfit(project) ?? calcExpectedProfit(project)
}

export function ProjectListPage() {
  const [view, setView] = useState<'card' | 'list'>('card')
  const [projects, setProjects] = useState<Project[]>([])
  const [pointSites, setPointSites] = useState<PointSite[]>([])
  const [loading, setLoading] = useState(true)

  const [keyword, setKeyword] = useState('')
  const [siteFilter, setSiteFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState<ProjectStatus | ''>('')
  const [monthFilter, setMonthFilter] = useState('')
  const [unfinishedOnly, setUnfinishedOnly] = useState(false)
  const [sortKey, setSortKey] = useState<SortKey>('updatedDesc')

  useEffect(() => {
    let cancelled = false
    async function load() {
      const [list, sites] = await Promise.all([listActiveProjects(), listPointSites()])
      if (cancelled) return
      setProjects(list)
      setPointSites(sites)
      setLoading(false)
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [])

  const siteNameById = useMemo(() => new Map(pointSites.map((s) => [s.id, s.name])), [pointSites])

  const filtered = useMemo(() => {
    let list = projects
    if (keyword.trim()) {
      const k = keyword.trim().toLowerCase()
      list = list.filter((p) => p.name.toLowerCase().includes(k))
    }
    if (siteFilter) list = list.filter((p) => p.pointSiteId === siteFilter)
    if (statusFilter) list = list.filter((p) => p.status === statusFilter)
    if (monthFilter) list = list.filter((p) => (p.implementationDate ?? '').startsWith(monthFilter))
    if (unfinishedOnly) list = list.filter((p) => p.status !== '完了' && p.status !== '非承認')

    const sorted = [...list].sort((a, b) => {
      if (sortKey === 'implementationDesc') {
        return (b.implementationDate ?? '').localeCompare(a.implementationDate ?? '')
      }
      if (sortKey === 'profitDesc') {
        const pa = displayProfit(a)
        const pb = displayProfit(b)
        if (pa == null && pb == null) return 0
        if (pa == null) return 1
        if (pb == null) return -1
        return pb - pa
      }
      return b.updatedAt.localeCompare(a.updatedAt)
    })
    return sorted
  }, [projects, keyword, siteFilter, statusFilter, monthFilter, unfinishedOnly, sortKey])

  return (
    <AppShell title="案件一覧">
      <div className="space-y-4">
        <div className="relative">
          <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-[var(--color-ink-soft)]" />
          <input
            type="search"
            placeholder="案件名で検索"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            className="w-full rounded-xl border border-[var(--color-line)] bg-[var(--color-surface)] py-2.5 pl-10 pr-3 text-sm outline-none focus:border-[var(--color-green-dark)]"
          />
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1 text-sm">
          <select value={siteFilter} onChange={(e) => setSiteFilter(e.target.value)} className={chipSelectClass}>
            <option value="">ポイントサイト：すべて</option>
            {pointSites.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as ProjectStatus | '')} className={chipSelectClass}>
            <option value="">ステータス：すべて</option>
            {PROJECT_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          <input
            type="month"
            value={monthFilter}
            onChange={(e) => setMonthFilter(e.target.value)}
            className={`${chipSelectClass} min-w-[9.5rem]`}
          />
          <button
            onClick={() => setUnfinishedOnly((v) => !v)}
            className={`shrink-0 rounded-full border px-3 py-1.5 font-bold ${
              unfinishedOnly
                ? 'border-[var(--color-green-dark)] bg-[var(--color-green)] text-[var(--color-green-text)]'
                : 'border-[var(--color-line)] bg-[var(--color-surface)] text-[var(--color-ink-soft)]'
            }`}
          >
            未完了のみ
          </button>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex gap-1 text-sm">
            <button
              onClick={() => setSortKey('updatedDesc')}
              className={`rounded-lg px-2 py-1 font-bold ${
                sortKey === 'updatedDesc' ? 'text-[var(--color-green-dark)] underline underline-offset-4' : 'text-[var(--color-ink-soft)]'
              }`}
            >
              更新が新しい順
            </button>
            <span className="text-[var(--color-line)]">|</span>
            <button
              onClick={() => setSortKey('implementationDesc')}
              className={`rounded-lg px-2 py-1 font-bold ${
                sortKey === 'implementationDesc' ? 'text-[var(--color-green-dark)] underline underline-offset-4' : 'text-[var(--color-ink-soft)]'
              }`}
            >
              実施日が新しい順
            </button>
            <span className="text-[var(--color-line)]">|</span>
            <button
              onClick={() => setSortKey('profitDesc')}
              className={`rounded-lg px-2 py-1 font-bold ${
                sortKey === 'profitDesc' ? 'text-[var(--color-green-dark)] underline underline-offset-4' : 'text-[var(--color-ink-soft)]'
              }`}
            >
              利益が高い順
            </button>
          </div>
          <div className="flex overflow-hidden rounded-lg border border-[var(--color-line)]">
            <button
              onClick={() => setView('card')}
              className={`p-2 ${view === 'card' ? 'bg-[var(--color-green)] text-[var(--color-green-text)]' : 'text-[var(--color-ink-soft)]'}`}
              aria-label="カード表示"
            >
              <PlusCircleIcon className="h-4 w-4 rotate-45" />
            </button>
            <button
              onClick={() => setView('list')}
              className={`p-2 ${view === 'list' ? 'bg-[var(--color-green)] text-[var(--color-green-text)]' : 'text-[var(--color-ink-soft)]'}`}
              aria-label="一覧表示"
            >
              <ListIcon className="h-4 w-4" />
            </button>
          </div>
        </div>

        {loading ? (
          <p className="text-sm text-[var(--color-ink-soft)]">読み込み中…</p>
        ) : filtered.length === 0 ? (
          <p className="rounded-xl border border-dashed border-[var(--color-line)] p-6 text-center text-sm text-[var(--color-ink-soft)]">
            {projects.length === 0 ? 'まだ案件が登録されていません。下部の「登録」から追加できます。' : '条件に合う案件が見つかりませんでした。'}
          </p>
        ) : (
          <div className={view === 'card' ? 'space-y-3' : 'divide-y divide-[var(--color-line)] rounded-2xl border border-[var(--color-line)] bg-[var(--color-surface)]'}>
            {filtered.map((p) =>
              view === 'card' ? (
                <Link key={p.id} to={`/projects/${p.id}`}>
                  <Card className="active:scale-[0.99]">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate font-bold">{p.name || '（名称未設定）'}</p>
                        <p className="text-xs text-[var(--color-ink-soft)]">{siteNameById.get(p.pointSiteId ?? '') ?? 'サイト未設定'}</p>
                      </div>
                      <ProjectStatusBadge status={p.status} />
                    </div>
                    <div className="mt-2 flex items-center justify-between text-sm">
                      <ProfitLabel profit={displayProfit(p)} />
                      <span className="text-[var(--color-ink-soft)]">
                        {p.implementationDate ? `実施日 ${p.implementationDate}` : '実施日未設定'}
                      </span>
                    </div>
                  </Card>
                </Link>
              ) : (
                <Link key={p.id} to={`/projects/${p.id}`} className="flex items-center justify-between gap-2 px-3 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold">{p.name || '（名称未設定）'}</p>
                    <p className="text-xs text-[var(--color-ink-soft)]">{siteNameById.get(p.pointSiteId ?? '') ?? 'サイト未設定'}</p>
                  </div>
                  <ProjectStatusBadge status={p.status} />
                </Link>
              ),
            )}
          </div>
        )}
      </div>
    </AppShell>
  )
}

function ProfitLabel({ profit }: { profit: number | null }) {
  if (profit == null) {
    return <span className="font-bold text-[var(--color-ink-soft)]">利益：―</span>
  }
  return (
    <span className={`font-bold ${profit < 0 ? 'text-[var(--color-warn-text)]' : 'text-[var(--color-green-text)]'}`}>
      {profit >= 0 ? '+' : ''}
      {formatYenOrDash(profit)}
    </span>
  )
}

const chipSelectClass =
  'shrink-0 rounded-full border border-[var(--color-line)] bg-[var(--color-surface)] px-3 py-1.5 font-bold text-[var(--color-ink-soft)] outline-none'
