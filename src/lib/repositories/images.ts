import { getDB } from '../db'
import { generateId } from '../generateId'
import type { ImageKind, ProjectImage } from '../../types'

export async function addProjectImage(
  projectId: string,
  kind: ImageKind,
  description: string,
  blob: Blob,
): Promise<ProjectImage> {
  const db = await getDB()
  const image: ProjectImage = {
    id: generateId(),
    projectId,
    kind,
    description,
    blob,
    createdAt: new Date().toISOString(),
  }
  await db.put('projectImages', image)
  return image
}

export async function listProjectImages(projectId: string): Promise<ProjectImage[]> {
  const db = await getDB()
  const all = await db.getAllFromIndex('projectImages', 'byProjectId', projectId)
  return all.sort((a, b) => a.createdAt.localeCompare(b.createdAt))
}

export async function updateImageDescription(id: string, description: string): Promise<void> {
  const db = await getDB()
  const image = await db.get('projectImages', id)
  if (!image) return
  await db.put('projectImages', { ...image, description })
}

export async function deleteProjectImage(id: string): Promise<void> {
  const db = await getDB()
  await db.delete('projectImages', id)
}
