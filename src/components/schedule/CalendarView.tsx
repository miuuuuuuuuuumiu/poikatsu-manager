import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Card } from '../common/Card'
import { listActiveProjects } from '../../lib/repositories/projects'
import { listTasks } from '../../lib/repositories/tasks'
import type { Project, TaskItem } from '../../types'

const WEEKDAYS = ['日', '月', '火', '水', '木', '金', '土']

type MarkKind = '作業' | '通帳' | '承認' | '解約' | '付与'

interface MarkItem {
  kind: MarkKind
  label: string
  projectId?: string
}

const MARK_LABEL: Record<MarkKind, string> = {
  作業: '次回作業日',
  通帳: '通帳反映予定日',
  承認: '承認予定日',
  解約: '解約期限',
  付与: 'ポイント付与日',
}

const MARK_COLOR: Record<MarkKind, string> = {
  作業: 'bg-[var(--color-green-dark)]',
  通帳: 'bg-blue-400',
  承認: 'bg-[var(--color-caution-text)]',
  解約: 'bg-[var(--color-warn-text)]',
  付与: 'bg-purple-400',
}

export function CalendarView() {
  const [current] = useState(() => new Date())
  const [selectedDay, setSelectedDay] = useState<number | null>(null)
  const [projects, setProjects] = useState<Project[]>([])
  const [tasks, setTasks] = useState<TaskItem[]>([])

  useEffect(() => {
    let cancelled = false
    Promise.all([listActiveProjects(), listTasks()]).then(([p, t]) => {
      if (!cancelled) {
        setProjects(p)
        setTasks(t)
      }
    })
    return () => {
      cancelled = true
    }
  }, [])

  const { year, month, days, firstWeekday } = useMemo(() => {
    const y = current.getFullYear()
    const m = current.getMonth()
    const lastDate = new Date(y, m + 1, 0).getDate()
    return { year: y, month: m, days: lastDate, firstWeekday: new Date(y, m, 1).getDay() }
  }, [current])

  const marksByDate = useMemo(() => {
    const map = new Map<string, MarkItem[]>()
    function add(dateStr: string | null, item: MarkItem) {
      if (!dateStr) return
      const list = map.get(dateStr) ?? []
      list.push(item)
      map.set(dateStr, list)
    }

    for (const p of projects) {
      const name = p.name || '（名称未設定）'
      add(p.passbookScheduledDate, { kind: '通帳', label: name, projectId: p.id })
      add(p.approvalScheduledDate, { kind: '承認', label: name, projectId: p.id })
      add(p.cancellationDeadline, { kind: '解約', label: name, projectId: p.id })
      add(p.pointGrantDate, { kind: '付与', label: name, projectId: p.id })
    }
    for (const t of tasks) {
      if (t.isDone) continue
      add(t.dueDate, { kind: '作業', label: t.title || '（名称未設定）' })
    }
    return map
  }, [projects, tasks])

  function dateStrFor(day: number): string {
    return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
  }

  const selectedMarks = selectedDay ? (marksByDate.get(dateStrFor(selectedDay)) ?? []) : []

  return (
    <div className="space-y-4">
      <p className="text-center text-lg font-extrabold">
        {year}年{month + 1}月
      </p>

      <div className="grid grid-cols-7 gap-1 text-center text-xs font-bold text-[var(--color-ink-soft)]">
        {WEEKDAYS.map((w) => (
          <div key={w}>{w}</div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {Array.from({ length: firstWeekday }).map((_, i) => (
          <div key={`blank-${i}`} />
        ))}
        {Array.from({ length: days }).map((_, i) => {
          const day = i + 1
          const marks = marksByDate.get(dateStrFor(day)) ?? []
          const uniqueKinds = [...new Set(marks.map((m) => m.kind))]
          return (
            <button
              key={day}
              onClick={() => setSelectedDay(day)}
              className={`flex aspect-square flex-col items-center justify-center rounded-lg text-sm ${
                selectedDay === day ? 'bg-[var(--color-green-dark)] text-white' : 'hover:bg-[var(--color-beige)]'
              }`}
            >
              {day}
              <span className="mt-0.5 flex gap-0.5">
                {uniqueKinds.map((k) => (
                  <span key={k} className={`h-1.5 w-1.5 rounded-full ${MARK_COLOR[k]}`} />
                ))}
              </span>
            </button>
          )
        })}
      </div>

      <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-[var(--color-ink-soft)]">
        {(Object.keys(MARK_LABEL) as MarkKind[]).map((key) => (
          <span key={key} className="flex items-center gap-1">
            <span className={`h-2 w-2 rounded-full ${MARK_COLOR[key]}`} />
            {MARK_LABEL[key]}
          </span>
        ))}
      </div>

      <Card>
        <p className="mb-2 font-bold">
          {selectedDay ? `${month + 1}月${selectedDay}日の予定` : '日付をタップすると予定が表示されます'}
        </p>
        {selectedDay && selectedMarks.length === 0 && <p className="text-sm text-[var(--color-ink-soft)]">この日の予定はありません</p>}
        {selectedMarks.map((m, i) =>
          m.projectId ? (
            <Link key={i} to={`/projects/${m.projectId}`} className="block text-sm text-[var(--color-green-dark)] underline">
              ・{MARK_LABEL[m.kind]}：{m.label}
            </Link>
          ) : (
            <p key={i} className="text-sm">
              ・{MARK_LABEL[m.kind]}：{m.label}
            </p>
          ),
        )}
      </Card>
    </div>
  )
}
