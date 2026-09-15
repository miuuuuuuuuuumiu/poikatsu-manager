import { getDB } from '../db'
import { INITIAL_POINT_SITE_NAMES } from '../constants'
import { generateId } from '../generateId'
import { notifyDataChanged } from '../syncTrigger'
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
          deletedAt: null,
        }
        await tx.store.add(site)
      }
      await tx.done
    })()
  }
  return seedPromise
}

/** 削除されていないポイントサイトの一覧 */
export async function listPointSites(): Promise<PointSite[]> {
  const db = await getDB()
  const sites = await db.getAll('pointSites')
  return sites.filter((s) => !s.deletedAt).sort((a, b) => a.createdAt.localeCompare(b.createdAt))
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
    deletedAt: null,
  }
}

export async function savePointSite(site: PointSite): Promise<void> {
  const db = await getDB()
  await db.put('pointSites', { ...site, updatedAt: new Date().toISOString() })
  notifyDataChanged()
}

/** クラウド同期用：削除済みも含めた全件を取得する */
export async function listAllPointSites(): Promise<PointSite[]> {
  const db = await getDB()
  return db.getAll('pointSites')
}

/** クラウド同期用：updatedAtを上書きせず、渡された内容をそのまま保存する */
export async function putPointSiteRaw(site: PointSite): Promise<void> {
  const db = await getDB()
  await db.put('pointSites', site)
}

/**
 * クラウド同期用：物理的に削除する（ソフトデリートではない）。
 * 新しい端末で初めて同期を有効にしたとき、その端末が自動登録した初期ポイントサイトと、
 * 同期先にすでにある初期ポイントサイトが別IDとして両方残ってしまうのを防ぐために使う。
 */
export async function deletePointSiteRaw(id: string): Promise<void> {
  const db = await getDB()
  await db.delete('pointSites', id)
}

/** ポイントサイトを削除する（タスクと同じ理由でソフトデリートにしている） */
export async function deletePointSite(id: string): Promise<void> {
  const db = await getDB()
  const site = await db.get('pointSites', id)
  if (!site) return
  const now = new Date().toISOString()
  await db.put('pointSites', { ...site, deletedAt: now, updatedAt: now })
  notifyDataChanged()
}
