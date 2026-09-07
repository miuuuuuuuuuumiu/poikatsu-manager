import { getDB } from '../db'
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
  }
}

export async function saveTask(task: TaskItem): Promise<void> {
  const db = await getDB()
  await db.put('tasks', { ...task, updatedAt: new Date().toISOString() })
}

export async function listTasks(): Promise<TaskItem[]> {
  const db = await getDB()
  const all = await db.getAll('tasks')
  return all.sort((a, b) => (a.dueDate ?? '9999-99-99').localeCompare(b.dueDate ?? '9999-99-99'))
}

export async function deleteTask(id: string): Promise<void> {
  const db = await getDB()
  await db.delete('tasks', id)
}
