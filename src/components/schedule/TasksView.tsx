import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { Card } from '../common/Card'
import { ConfirmDialog } from '../common/ConfirmDialog'
import { WarningIcon } from '../icons'
import { NotificationSetup } from './NotificationSetup'
import { classifyDueDate, type DueBucket } from '../../lib/dateUtils'
import { createBlankTask, deleteTask, listTasks, saveTask } from '../../lib/repositories/tasks'
import { listActiveProjects } from '../../lib/repositories/projects'
import { useDueTaskNotifications } from '../../hooks/useDueTaskNotifications'
import { generateId } from '../../lib/generateId'
import type { Project, TaskItem, TaskPriority } from '../../types'

const BUCKETS: DueBucket[] = ['期限超過', '今日', '3日以内', '7日以内', 'それ以降']

const BUCKET_STYLE: Record<DueBucket, string> = {
  期限超過: 'text-[var(--color-warn-text)]',
  今日: 'text-[var(--color-warn-text)]',
  '3日以内': 'text-[var(--color-caution-text)]',
  '7日以内': 'text-[var(--color-green-text)]',
  それ以降: 'text-[var(--color-ink-soft)]',
}

export function TasksView() {
  const [tasks, setTasks] = useState<TaskItem[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<TaskItem | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<TaskItem | null>(null)

  async function reload() {
    const [t, p] = await Promise.all([listTasks(), listActiveProjects()])
    setTasks(t)
    setProjects(p)
    setLoading(false)
  }

  useEffect(() => {
    void reload()
  }, [])

  useDueTaskNotifications(tasks)

  const projectNameById = useMemo(() => new Map(projects.map((p) => [p.id, p.name || '（名称未設定）'])), [projects])

  const grouped = useMemo(() => {
    const groups = new Map<DueBucket, TaskItem[]>()
    const noDueDate: TaskItem[] = []
    for (const t of tasks) {
      if (t.isDone) continue
      const bucket = classifyDueDate(t.dueDate)
      if (!bucket) {
        noDueDate.push(t)
        continue
      }
      const list = groups.get(bucket) ?? []
      list.push(t)
      groups.set(bucket, list)
    }
    return { groups, noDueDate }
  }, [tasks])

  const doneTasks = useMemo(() => tasks.filter((t) => t.isDone), [tasks])

  async function toggleDone(task: TaskItem) {
    await saveTask({ ...task, isDone: !task.isDone })
    await reload()
  }

  async function handleSave() {
    if (!editing) return
    await saveTask(editing)
    setEditing(null)
    await reload()
  }

  async function handleDeleteConfirmed() {
    if (!deleteTarget) return
    await deleteTask(deleteTarget.id)
    setDeleteTarget(null)
    if (editing?.id === deleteTarget.id) setEditing(null)
    await reload()
  }

  return (
    <div className="space-y-5">
      <NotificationSetup />

      <button
        onClick={() => setEditing(createBlankTask(generateId()))}
        className="w-full rounded-xl bg-[var(--color-green-dark)] py-2.5 text-sm font-bold text-white"
      >
        ＋ 作業を追加
      </button>

      {editing && (
        <TaskEditor
          task={editing}
          projects={projects}
          onChange={setEditing}
          onSave={handleSave}
          onCancel={() => setEditing(null)}
          onDelete={() => setDeleteTarget(editing)}
        />
      )}

      {loading ? (
        <p className="text-sm text-[var(--color-ink-soft)]">読み込み中…</p>
      ) : (
        <>
          {BUCKETS.map((bucket) => {
            const list = grouped.groups.get(bucket) ?? []
            if (list.length === 0) return null
            return (
              <section key={bucket}>
                <h2 className={`mb-2 flex items-center gap-1 text-sm font-bold ${BUCKET_STYLE[bucket]}`}>
                  {(bucket === '期限超過' || bucket === '今日') && <WarningIcon className="h-4 w-4" />}
                  {bucket}（{list.length}件）
                </h2>
                <div className="space-y-2">
                  {list.map((t) => (
                    <TaskRow
                      key={t.id}
                      task={t}
                      projectName={t.projectId ? projectNameById.get(t.projectId) : undefined}
                      onToggleDone={() => toggleDone(t)}
                      onEdit={() => setEditing(t)}
                    />
                  ))}
                </div>
              </section>
            )
          })}

          {grouped.noDueDate.length > 0 && (
            <section>
              <h2 className="mb-2 text-sm font-bold text-[var(--color-ink-soft)]">期限未設定（{grouped.noDueDate.length}件）</h2>
              <div className="space-y-2">
                {grouped.noDueDate.map((t) => (
                  <TaskRow
                    key={t.id}
                    task={t}
                    projectName={t.projectId ? projectNameById.get(t.projectId) : undefined}
                    onToggleDone={() => toggleDone(t)}
                    onEdit={() => setEditing(t)}
                  />
                ))}
              </div>
            </section>
          )}

          {tasks.length === 0 && (
            <p className="rounded-xl border border-dashed border-[var(--color-line)] p-6 text-center text-sm text-[var(--color-ink-soft)]">
              まだ作業が登録されていません。上の「＋ 作業を追加」から追加できます。
            </p>
          )}

          {doneTasks.length > 0 && (
            <section>
              <h2 className="mb-2 text-sm font-bold text-[var(--color-ink-soft)]">完了した作業</h2>
              <div className="space-y-2 opacity-60">
                {doneTasks.map((t) => (
                  <TaskRow
                    key={t.id}
                    task={t}
                    projectName={t.projectId ? projectNameById.get(t.projectId) : undefined}
                    onToggleDone={() => toggleDone(t)}
                    onEdit={() => setEditing(t)}
                  />
                ))}
              </div>
            </section>
          )}
        </>
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        title={`「${deleteTarget?.title || '（名称未設定）'}」を削除しますか？`}
        confirmLabel="削除する"
        onConfirm={handleDeleteConfirmed}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  )
}

function TaskRow({
  task,
  projectName,
  onToggleDone,
  onEdit,
}: {
  task: TaskItem
  projectName?: string
  onToggleDone: () => void
  onEdit: () => void
}) {
  return (
    <Card className="flex items-start gap-3 py-3">
      <input
        type="checkbox"
        checked={task.isDone}
        onChange={onToggleDone}
        className="mt-0.5 h-5 w-5 shrink-0 accent-[var(--color-green-dark)]"
      />
      <button onClick={onEdit} className="min-w-0 flex-1 text-left">
        <p className={`font-bold ${task.isDone ? 'line-through' : ''}`}>{task.title || '（名称未設定）'}</p>
        <p className="text-xs text-[var(--color-ink-soft)]">
          {projectName ? projectName : ''}
          {task.dueDate ? `${projectName ? '・' : ''}期限 ${task.dueDate}` : ''}
        </p>
      </button>
      <span className="shrink-0 rounded-full bg-[var(--color-beige)] px-2 py-0.5 text-xs font-bold">優先度：{task.priority}</span>
    </Card>
  )
}

function TaskEditor({
  task,
  projects,
  onChange,
  onSave,
  onCancel,
  onDelete,
}: {
  task: TaskItem
  projects: Project[]
  onChange: (task: TaskItem) => void
  onSave: () => void
  onCancel: () => void
  onDelete: () => void
}) {
  return (
    <Card className="space-y-3 border-2 border-[var(--color-green-dark)]">
      <Field label="作業名">
        <input type="text" value={task.title} onChange={(e) => onChange({ ...task, title: e.target.value })} className={inputClass} />
      </Field>
      <Field label="期限">
        <input
          type="date"
          value={task.dueDate ?? ''}
          onChange={(e) => onChange({ ...task, dueDate: e.target.value || null })}
          className={inputClass}
        />
      </Field>
      <Field label="優先度">
        <select
          value={task.priority}
          onChange={(e) => onChange({ ...task, priority: e.target.value as TaskPriority })}
          className={inputClass}
        >
          <option value="高">高</option>
          <option value="中">中</option>
          <option value="低">低</option>
        </select>
      </Field>
      <Field label="案件へのリンク（任意）">
        <select
          value={task.projectId ?? ''}
          onChange={(e) => onChange({ ...task, projectId: e.target.value || null })}
          className={inputClass}
        >
          <option value="">リンクしない</option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name || '（名称未設定）'}
            </option>
          ))}
        </select>
      </Field>
      <Field label="メモ">
        <textarea rows={2} value={task.memo} onChange={(e) => onChange({ ...task, memo: e.target.value })} className={inputClass} />
      </Field>
      <label className="flex items-center gap-2 text-sm font-bold">
        <input
          type="checkbox"
          checked={task.isDone}
          onChange={(e) => onChange({ ...task, isDone: e.target.checked })}
          className="h-4 w-4 accent-[var(--color-green-dark)]"
        />
        完了にする
      </label>

      <div className="flex gap-2 pt-1">
        <button onClick={onCancel} className="flex-1 rounded-xl border border-[var(--color-line)] py-2.5 text-sm font-bold">
          キャンセル
        </button>
        <button onClick={onSave} className="flex-1 rounded-xl bg-[var(--color-green-dark)] py-2.5 text-sm font-bold text-white">
          保存する
        </button>
      </div>
      <button onClick={onDelete} className="w-full text-center text-xs font-bold text-[var(--color-warn-text)]">
        この作業を削除する
      </button>
    </Card>
  )
}

const inputClass =
  'w-full rounded-xl border border-[var(--color-line)] bg-[var(--color-surface)] px-3 py-2.5 text-sm outline-none focus:border-[var(--color-green-dark)]'

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-bold text-[var(--color-ink-soft)]">{label}</span>
      {children}
    </label>
  )
}
