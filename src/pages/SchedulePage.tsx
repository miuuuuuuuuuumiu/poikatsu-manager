import { useSearchParams } from 'react-router-dom'
import { AppShell } from '../components/layout/AppShell'
import { CalendarView } from '../components/schedule/CalendarView'
import { TasksView } from '../components/schedule/TasksView'

const TABS = [
  { key: 'calendar', label: 'カレンダー' },
  { key: 'tasks', label: 'やることリスト' },
] as const

type TabKey = (typeof TABS)[number]['key']

/** ⑤カレンダー画面と④やること・期限管理画面をタブでまとめた「予定」画面 */
export function SchedulePage() {
  const [params, setParams] = useSearchParams()
  const tab: TabKey = params.get('tab') === 'tasks' ? 'tasks' : 'calendar'

  return (
    <AppShell title="予定">
      <div className="space-y-4">
        <div className="flex gap-2 rounded-xl bg-[var(--color-beige)] p-1 text-sm">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setParams(t.key === 'calendar' ? {} : { tab: t.key })}
              className={`flex-1 rounded-lg py-2 font-bold ${
                tab === t.key ? 'bg-[var(--color-surface)] text-[var(--color-ink)] shadow-sm' : 'text-[var(--color-ink-soft)]'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {tab === 'calendar' ? <CalendarView /> : <TasksView />}
      </div>
    </AppShell>
  )
}
