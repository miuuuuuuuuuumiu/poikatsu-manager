// JSON完全バックアップ（画像を含む）の作成・復元をここに一本化する。
// 画像（Blob）はJSONに直接入れられないため、base64のデータURL文字列に変換して保存する。
import { getDB } from './db'
import { getSettings, saveSettings } from './repositories/settings'
import type { AppSettings, ImageKind, PointSite, Project, TaskItem } from '../types'

export const BACKUP_VERSION = 1

export interface BackupImage {
  id: string
  projectId: string
  kind: ImageKind
  description: string
  createdAt: string
  dataUrl: string
}

export interface BackupData {
  version: number
  exportedAt: string
  projects: Project[]
  pointSites: PointSite[]
  tasks: TaskItem[]
  settings: AppSettings
  images: BackupImage[]
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(new Error('画像の読み込みに失敗しました'))
    reader.readAsDataURL(blob)
  })
}

function dataUrlToBlob(dataUrl: string): Blob {
  const [header, base64] = dataUrl.split(',')
  const mimeMatch = /data:(.*);base64/.exec(header)
  const mime = mimeMatch ? mimeMatch[1] : 'application/octet-stream'
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return new Blob([bytes], { type: mime })
}

export async function buildBackup(): Promise<BackupData> {
  const db = await getDB()
  const [projects, pointSites, tasks, settings, images] = await Promise.all([
    db.getAll('projects'),
    db.getAll('pointSites'),
    db.getAll('tasks'),
    getSettings(),
    db.getAll('projectImages'),
  ])

  const backupImages: BackupImage[] = await Promise.all(
    images.map(async (img) => ({
      id: img.id,
      projectId: img.projectId,
      kind: img.kind,
      description: img.description,
      createdAt: img.createdAt,
      dataUrl: await blobToDataUrl(img.blob),
    })),
  )

  return {
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    projects,
    pointSites,
    tasks,
    settings,
    images: backupImages,
  }
}

/** アップロードされたJSONが、最低限バックアップとして扱える形をしているか確認する */
export function isValidBackup(data: unknown): data is BackupData {
  if (!data || typeof data !== 'object') return false
  const d = data as Record<string, unknown>
  return Array.isArray(d.projects) && Array.isArray(d.pointSites)
}

export async function restoreBackup(data: BackupData): Promise<void> {
  const db = await getDB()

  const txProjects = db.transaction('projects', 'readwrite')
  for (const p of data.projects) await txProjects.store.put(p)
  await txProjects.done

  const txSites = db.transaction('pointSites', 'readwrite')
  for (const s of data.pointSites) await txSites.store.put(s)
  await txSites.done

  const txTasks = db.transaction('tasks', 'readwrite')
  for (const t of data.tasks ?? []) await txTasks.store.put(t)
  await txTasks.done

  if (data.settings) await saveSettings(data.settings)

  const txImages = db.transaction('projectImages', 'readwrite')
  for (const img of data.images ?? []) {
    await txImages.store.put({
      id: img.id,
      projectId: img.projectId,
      kind: img.kind,
      description: img.description,
      createdAt: img.createdAt,
      blob: dataUrlToBlob(img.dataUrl),
    })
  }
  await txImages.done
}
