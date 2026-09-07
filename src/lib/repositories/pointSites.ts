import { getDB } from '../db'
import { INITIAL_POINT_SITE_NAMES } from '../constants'
import { generateId } from '../generateId'
import type { PointSite } from '../../types'

let seedPromise: Promise<void> | null = null

/**
 * 初回起動時だけ、初期ポイントサイトを登録する（すでにデータがあれば何もしない）。
 * React（開発時のStrictMode）が同時に2回呼び出すことがあっても二重登録されないよう、
 * 実行中の処理を使い回す（呼び出しごとに新しく処理を始めない）。
 */
export function seedPointSitesIfEmpty(): Promise<void> {
  if (!seedPromise) {
    seedPromise = (async () => {
      const db = await getDB()
      const count = await db.count('pointSites')
      if (count > 0) return

      const now = new Date().toISOString()
      const tx = db.transaction('pointSites', 'readwrite')
      for (const name of INITIAL_POINT_SITE_NAMES) {
        const site: PointSite = {
          id: generateId(),
          name,
          pointsPerYen: null,
          inquiryUrl: '',
          memo: '',
          isActive: true,
          createdAt: now,
          updatedAt: now,
        }
        await tx.store.add(site)
      }
      await tx.done
    })()
  }
  return seedPromise
}

export async function listPointSites(): Promise<PointSite[]> {
  const db = await getDB()
  const sites = await db.getAll('pointSites')
  return sites.sort((a, b) => a.createdAt.localeCompare(b.createdAt))
}

export async function getPointSite(id: string): Promise<PointSite | undefined> {
  const db = await getDB()
  return db.get('pointSites', id)
}

export function createBlankPointSite(id: string): PointSite {
  const now = new Date().toISOString()
  return {
    id,
    name: '',
    pointsPerYen: null,
    inquiryUrl: '',
    memo: '',
    isActive: true,
    createdAt: now,
    updatedAt: now,
  }
}

export async function savePointSite(site: PointSite): Promise<void> {
  const db = await getDB()
  await db.put('pointSites', { ...site, updatedAt: new Date().toISOString() })
}

export async function deletePointSite(id: string): Promise<void> {
  const db = await getDB()
  await db.delete('pointSites', id)
}
