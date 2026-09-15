import { getDB } from '../db'
import { generateId } from '../generateId'
import { notifyDataChanged } from '../syncTrigger'
import type { ImageKind, ProjectImage } from '../../types'

export async function addProjectImage(
  projectId: string,
  kind: ImageKind,
  description: string,
  blob: Blob,
): Promise<ProjectImage> {
  const db = await getDB()
  const now = new Date().toISOString()
  const image: ProjectImage = {
    id: generateId(),
    projectId,
    kind,
    description,
    blob,
    createdAt: now,
    updatedAt: now,
    syncedAt: null,
    deletedAt: null,
  }
  await db.put('projectImages', image)
  notifyDataChanged()
  return image
}

/** 削除されていない画像の一覧 */
export async function listProjectImages(projectId: string): Promise<ProjectImage[]> {
  const db = await getDB()
  const all = await db.getAllFromIndex('projectImages', 'byProjectId', projectId)
  return all.filter((img) => !img.deletedAt).sort((a, b) => a.createdAt.localeCompare(b.createdAt))
}

/** クラウド同期用：プロジェクトを問わず、削除済みも含めた全画像を取得する */
export async function listAllProjectImages(): Promise<ProjectImage[]> {
  const db = await getDB()
  return db.getAll('projectImages')
}

export async function getProjectImage(id: string): Promise<ProjectImage | undefined> {
  const db = await getDB()
  return db.get('projectImages', id)
}

export async function updateImageDescription(id: string, description: string): Promise<void> {
  const db = await getDB()
  const image = await db.get('projectImages', id)
  if (!image) return
  // 説明文が変わったら、次回の同期でもう一度アップロードし直す必要があるためsyncedAtをリセットする
  await db.put('projectImages', { ...image, description, updatedAt: new Date().toISOString(), syncedAt: null })
  notifyDataChanged()
}

/** 画像を削除する（他のデータと同じ理由でソフトデリートにしている） */
export async function deleteProjectImage(id: string): Promise<void> {
  const db = await getDB()
  const image = await db.get('projectImages', id)
  if (!image) return
  const now = new Date().toISOString()
  await db.put('projectImages', { ...image, deletedAt: now, updatedAt: now })
  notifyDataChanged()
}

export async function markImageSynced(id: string): Promise<void> {
  const db = await getDB()
  const image = await db.get('projectImages', id)
  if (!image) return
  await db.put('projectImages', { ...image, syncedAt: new Date().toISOString() })
}

/** クラウド同期用：updatedAt等を上書きせず、渡された内容（マージ結果）をそのまま保存する */
export async function putProjectImageRaw(image: ProjectImage): Promise<void> {
  const db = await getDB()
  await db.put('projectImages', image)
}
