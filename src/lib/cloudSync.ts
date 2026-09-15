// PC⇔スマホの自動同期をここに一本化する。
// 無料のGoogle Apps Script（GAS）をごく簡易なバックエンドとして使い、
// 「案件・作業・ポイントサイト・設定」は全件リストごとGET/POSTでやり取りし、
// 画像（Blob）だけは容量が大きいので、まだ相手側に無いものだけを個別に送受信する。
//
// 同期のたびに「取得→マージ→保存→送信」の順で行う（pull→merge→push）。
// マージは id ごとに updatedAt を比較し、新しい方を採用する Last-Write-Wins。
// これにより「片方の全件送信で、もう片方の新しい変更を消してしまう」事故を防いでいる。
import { getSettings, saveSettings } from './repositories/settings'
import { listAllProjects, putProjectRaw } from './repositories/projects'
import { listAllTasks, putTaskRaw } from './repositories/tasks'
import { listAllPointSites, putPointSiteRaw, deletePointSiteRaw } from './repositories/pointSites'
import { listAllProjectImages, putProjectImageRaw, markImageSynced } from './repositories/images'
import { base64ToBlob, blobToBase64 } from './blobEncoding'
import type { AppSettings, PointSite, Project, ProjectImage, TaskItem } from '../types'

export interface SyncResult {
  ok: boolean
  message: string
}

interface WithIdAndUpdatedAt {
  id: string
  updatedAt: string
}

/**
 * id単位でupdatedAtを比較し、新しい方を採用するマージ処理。
 * ローカルにしか無いID・リモートにしか無いIDは、どちらもそのまま結果に残す
 * （まだ送信/受信できていないだけの可能性があるため、ここでは削らない）。
 */
export function mergeById<T extends WithIdAndUpdatedAt>(local: T[], remote: T[]): T[] {
  const map = new Map<string, T>()
  for (const item of local) map.set(item.id, item)
  for (const item of remote) {
    const existing = map.get(item.id)
    if (!existing || item.updatedAt > existing.updatedAt) {
      map.set(item.id, item)
    }
  }
  return [...map.values()]
}

class SyncHttpError extends Error {}

async function gasGet(url: string, params: Record<string, string>): Promise<Record<string, unknown>> {
  const qs = new URLSearchParams(params).toString()
  const res = await fetch(`${url}?${qs}`)
  if (!res.ok) throw new SyncHttpError(`通信エラー（HTTP ${res.status}）`)
  const data: Record<string, unknown> = await res.json()
  if (data.status === 'error') throw new SyncHttpError(String(data.message ?? '同期エラーが発生しました'))
  return data
}

async function gasPost(url: string, body: Record<string, unknown>): Promise<Record<string, unknown>> {
  // GAS Web AppはCORSのプリフライト(OPTIONS)を処理できないため、
  // プリフライトが発生しない text/plain として送り、GAS側でJSONとして読み取ってもらう。
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new SyncHttpError(`通信エラー（HTTP ${res.status}）`)
  const data: Record<string, unknown> = await res.json()
  if (data.status === 'error') throw new SyncHttpError(String(data.message ?? '同期エラーが発生しました'))
  return data
}

async function syncListType<T extends WithIdAndUpdatedAt>(
  url: string,
  token: string,
  type: 'projects' | 'tasks' | 'pointSites',
  listAll: () => Promise<T[]>,
  putRaw: (item: T) => Promise<void>,
): Promise<void> {
  const local = await listAll()
  const remoteRes = await gasGet(url, { token, type })
  const remote = (remoteRes[type] as T[] | undefined) ?? []
  const merged = mergeById(local, remote)
  for (const item of merged) await putRaw(item)
  await gasPost(url, { token, type, [type]: merged })
}

async function syncSettings(url: string, token: string, current: AppSettings): Promise<AppSettings> {
  const remoteRes = await gasGet(url, { token, type: 'settings' })
  const remote = remoteRes.settings as AppSettings | null | undefined

  let merged = current
  if (remote && remote.updatedAt > current.updatedAt) {
    // 接続先（URL・合言葉）などのこの端末固有の設定は、相手側の値で上書きしない
    merged = { ...remote, sync: current.sync }
  }
  await saveSettings(merged)
  await gasPost(url, { token, type: 'settings', settings: merged })
  return merged
}

type ImageMeta = Omit<ProjectImage, 'blob'>

async function syncImages(url: string, token: string): Promise<void> {
  const localImages = await listAllProjectImages()
  const localMeta: ImageMeta[] = localImages.map(({ blob: _blob, ...meta }) => meta)
  const localIds = new Set(localImages.map((img) => img.id))

  const remoteRes = await gasGet(url, { token, type: 'images' })
  const remoteMeta = (remoteRes.images as ImageMeta[] | undefined) ?? []

  const mergedMeta = mergeById(localMeta, remoteMeta)

  // リモートにしか無い画像は、実データ（Blob）を個別にダウンロードする。
  // ただし削除済みの画像は画面に表示しないため、わざわざ実データを取りに行かない
  // （アップロードされていない可能性もあり、その場合は取得エラーになってしまうため）。
  for (const meta of mergedMeta) {
    if (localIds.has(meta.id) || meta.deletedAt) continue
    try {
      const blobRes = await gasGet(url, { token, action: 'getImageBlob', id: meta.id })
      const base64 = blobRes.base64 as string | undefined
      if (!base64) continue
      const blob = base64ToBlob(base64, String(blobRes.mimeType ?? 'image/jpeg'))
      await putProjectImageRaw({ ...meta, blob, syncedAt: new Date().toISOString() })
    } catch {
      // 1件の画像取得に失敗しても、他のデータの同期は続ける（次回また試みる）
    }
  }

  // まだアップロードしていない（syncedAtが無い）画像は、実データを送る。
  // 削除済みならアップロードする意味が無いのでスキップする。
  for (const img of localImages) {
    if (img.syncedAt || img.deletedAt) continue
    try {
      const base64 = await blobToBase64(img.blob)
      await gasPost(url, { token, action: 'uploadImage', id: img.id, mimeType: img.blob.type, base64 })
      await markImageSynced(img.id)
    } catch {
      // 1件のアップロードに失敗しても、他のデータの同期は続ける（次回また試みる）
    }
  }

  await gasPost(url, { token, type: 'images', images: mergedMeta })
}

/** 設定画面の「接続テスト」用：URLと合言葉が正しいか、実際に通信して確認する */
export async function testConnection(url: string, token: string): Promise<SyncResult> {
  try {
    await gasGet(url, { token, action: 'ping' })
    return { ok: true, message: '接続できました' }
  } catch (error) {
    const message = error instanceof Error ? error.message : '接続できませんでした'
    return { ok: false, message }
  }
}

let debounceTimer: ReturnType<typeof setTimeout> | undefined

/** 編集からしばらく（既定2秒）待ってから同期する。連続入力のたびに通信しないようにするため */
export function scheduleSync(delayMs = 2000): void {
  if (debounceTimer) clearTimeout(debounceTimer)
  debounceTimer = setTimeout(() => {
    void syncNow()
  }, delayMs)
}

let syncInFlight: Promise<SyncResult> | null = null

/**
 * 今すぐ同期を実行する。すでに実行中の場合は、その完了を待って同じ結果を返す
 * （短い間隔で連続して呼ばれても、通信を何重にも走らせないようにするため）。
 */
export function syncNow(): Promise<SyncResult> {
  if (!syncInFlight) {
    syncInFlight = runSync().finally(() => {
      syncInFlight = null
    })
  }
  return syncInFlight
}

/**
 * 新しい端末で初めて同期を有効にしたとき、その端末が自動登録した「初期ポイントサイト16件」と、
 * 同期先にすでにある（別の端末が登録した）初期ポイントサイト16件が、別IDのまま両方とも
 * 残ってしまうのを防ぐ。ローカルのポイントサイトが「まだ一度も編集されていない初期状態のまま」
 * （updatedAtとcreatedAtが同じ）で、かつ同期先に何かデータがある場合だけ、ローカルの初期データを
 * 消してから通常の同期に進む（同期先の内容に揃えるため）。
 * 一度でも自分で手を加えていたり、同期先がまだ空の場合は何もしない。
 */
async function dedupeSeedPointSitesBeforeFirstSync(url: string, token: string): Promise<void> {
  const local = await listAllPointSites()
  const isPristine = local.length > 0 && local.every((s) => s.updatedAt === s.createdAt)
  if (!isPristine) return

  const remoteRes = await gasGet(url, { token, type: 'pointSites' })
  const remote = (remoteRes.pointSites as PointSite[] | undefined) ?? []
  if (remote.length === 0) return

  for (const site of local) await deletePointSiteRaw(site.id)
}

async function runSync(): Promise<SyncResult> {
  const settings = await getSettings()
  const { enabled, webAppUrl, token } = settings.sync
  if (!enabled || !webAppUrl || !token) {
    return { ok: false, message: '同期が設定されていません' }
  }

  try {
    if (!settings.sync.lastSyncedAt) {
      await dedupeSeedPointSitesBeforeFirstSync(webAppUrl, token)
    }

    await syncListType<Project>(webAppUrl, token, 'projects', listAllProjects, putProjectRaw)
    await syncListType<TaskItem>(webAppUrl, token, 'tasks', listAllTasks, putTaskRaw)
    await syncListType<PointSite>(webAppUrl, token, 'pointSites', listAllPointSites, putPointSiteRaw)
    await syncImages(webAppUrl, token)

    const latestSettings = await getSettings()
    const mergedSettings = await syncSettings(webAppUrl, token, latestSettings)
    await saveSettings({ ...mergedSettings, sync: { ...mergedSettings.sync, lastSyncedAt: new Date().toISOString() } })

    return { ok: true, message: '同期しました' }
  } catch (error) {
    const message = error instanceof Error ? error.message : '同期に失敗しました'
    return { ok: false, message }
  }
}
