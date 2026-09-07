import { openDB, type DBSchema, type IDBPDatabase } from 'idb'
import type { AppSettings, PointSite, Project, ProjectImage, TaskItem } from '../types'

interface PoikatsuDB extends DBSchema {
  projects: {
    key: string
    value: Project
    indexes: { byUpdatedAt: string; byStatus: string; byDeletedAt: string }
  }
  pointSites: {
    key: string
    value: PointSite
  }
  projectImages: {
    key: string
    value: ProjectImage
    indexes: { byProjectId: string }
  }
  tasks: {
    key: string
    value: TaskItem
    indexes: { byDueDate: string; byProjectId: string }
  }
  settings: {
    key: string
    value: AppSettings
  }
}

const DB_NAME = 'poikatsu-manager'
const DB_VERSION = 1
export const SETTINGS_KEY = 'app-settings'

let dbPromise: Promise<IDBPDatabase<PoikatsuDB>> | null = null

export function getDB() {
  if (!dbPromise) {
    dbPromise = openDB<PoikatsuDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        const projects = db.createObjectStore('projects', { keyPath: 'id' })
        projects.createIndex('byUpdatedAt', 'updatedAt')
        projects.createIndex('byStatus', 'status')
        projects.createIndex('byDeletedAt', 'deletedAt')

        db.createObjectStore('pointSites', { keyPath: 'id' })

        const images = db.createObjectStore('projectImages', { keyPath: 'id' })
        images.createIndex('byProjectId', 'projectId')

        const tasks = db.createObjectStore('tasks', { keyPath: 'id' })
        tasks.createIndex('byDueDate', 'dueDate')
        tasks.createIndex('byProjectId', 'projectId')

        db.createObjectStore('settings')
      },
    })
  }
  return dbPromise
}

export type { PoikatsuDB }
