import { getDB } from '../db'
import { notifyDataChanged } from '../syncTrigger'
import type { TaskItem } from '../../types'

export function createBlankTask(id: string): TaskItem {
  const now = new Date().toISOString()
  return {
    id,
    projectId: null,
    title: '',
    dueDate: null,
    priority: '中',
    memo: '',
    isDone: false,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
  }
}

export async function saveTask(task: TaskItem): Promise<void> {
  const db = await getDB()
  await db.put('tasks', { ...task, updatedAt: new Date().toISOString() })
  notifyDataChanged()
}

/** 削除されていない作業の一覧（クラウド同期など、削除済みも含めた全件が必要な場合はgetAllを直接使う） */
export async function listTasks(): Promise<TaskItem[]> {
  const db = await getDB()
  const all = await db.getAll('tasks')
  return all
    .filter((t) => !t.deletedAt)
    .sort((a, b) => (a.dueDate ?? '9999-99-99').localeCompare(b.dueDate ?? '9999-99-99'))
}

/** クラウド同期用：削除済みも含めた全件を取得する */
export async function listAllTasks(): Promise<TaskItem[]> {
  const db = await getDB()
  return db.getAll('tasks')
}

/** クラウド同期用：updatedAtを上書きせず、渡された内容をそのまま保存する */
export async function putTaskRaw(task: TaskItem): Promise<void> {
  const db = await getDB()
  await db.put('tasks', task)
}

/**
 * 作業を削除する（すぐには消さず、削除日時を記録するだけにする）。
 * クラウド同期を使っている場合、一覧から単純に消えただけだと「まだ送信していないだけ」なのか
 * 「本当に削除された」のか区別できず、他の端末で復活してしまう。削除日時というフィールドの
 * 更新として扱うことで、他のフィールドの変更と同じ仕組みで安全に同期できるようにしている。
 */
export async function deleteTask(id: string): Promise<void> {
  const db = await getDB()
  const task = await db.get('tasks', id)
  if (!task) return
  const now = new Date().toISOString()
  await db.put('tasks', { ...task, deletedAt: now, updatedAt: now })
  notifyDataChanged()
}
