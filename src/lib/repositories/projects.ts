import { getDB } from '../db'
import { notifyDataChanged } from '../syncTrigger'
import { createEmptyPersonalInfoUsage, type Project } from '../../types'

/** 新規登録画面を開いたときの、まだ何も保存していない状態の案件データを作る */
export function createBlankProject(id: string): Project {
  const now = new Date().toISOString()
  return {
    id,
    status: '下書き',

    implementationDate: null,
    pointSiteId: null,
    name: '',
    url: '',
    condition: '',
    category: '',
    userName: '',
    memo: '',

    expectedPoints: null,
    confirmedPoints: null,
    yenPerPointOverride: null,
    bonusReward: 0,
    bonusRewardConfirmed: 0,
    outOfPocketCost: 0,

    passbookScheduledDate: null,
    passbookActualDate: null,
    approvalScheduledDate: null,
    pointGrantDate: null,
    cancellationDeadline: null,
    cancellationStatus: '解約不要',
    inquiryStatus: '',
    inquiryUrl: '',

    personalInfoUsage: createEmptyPersonalInfoUsage(),
    imageIds: [],

    createdAt: now,
    updatedAt: now,
    deletedAt: null,
  }
}

/** 案件を保存する（新規・更新どちらも同じ処理。idが同じなら上書きされるので二重登録されない） */
export async function saveProject(project: Project): Promise<void> {
  const db = await getDB()
  const toSave: Project = { ...project, updatedAt: new Date().toISOString() }
  await db.put('projects', toSave)
  notifyDataChanged()
}

export async function getProject(id: string): Promise<Project | undefined> {
  const db = await getDB()
  return db.get('projects', id)
}

/** ゴミ箱に入っていない案件の一覧（更新日時が新しい順） */
export async function listActiveProjects(): Promise<Project[]> {
  const db = await getDB()
  const all = await db.getAll('projects')
  return all
    .filter((p) => !p.deletedAt)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
}

/** クラウド同期用：ゴミ箱の案件も含めた全件を取得する */
export async function listAllProjects(): Promise<Project[]> {
  const db = await getDB()
  return db.getAll('projects')
}

/** クラウド同期用：updatedAtを上書きせず、渡された内容をそのまま保存する（マージ結果を保存するため） */
export async function putProjectRaw(project: Project): Promise<void> {
  const db = await getDB()
  await db.put('projects', project)
}

export async function listTrashedProjects(): Promise<Project[]> {
  const db = await getDB()
  const all = await db.getAll('projects')
  return all
    .filter((p) => !!p.deletedAt)
    .sort((a, b) => (b.deletedAt ?? '').localeCompare(a.deletedAt ?? ''))
}

/** 案件をゴミ箱へ移動する（すぐには消さない） */
export async function moveProjectToTrash(id: string): Promise<void> {
  const db = await getDB()
  const project = await db.get('projects', id)
  if (!project) return
  const now = new Date().toISOString()
  await db.put('projects', { ...project, deletedAt: now, updatedAt: now })
  notifyDataChanged()
}

export async function restoreProjectFromTrash(id: string): Promise<void> {
  const db = await getDB()
  const project = await db.get('projects', id)
  if (!project) return
  const now = new Date().toISOString()
  await db.put('projects', { ...project, deletedAt: null, updatedAt: now })
  notifyDataChanged()
}

/** ゴミ箱から完全に削除する（元に戻せない） */
export async function purgeProject(id: string): Promise<void> {
  const db = await getDB()
  await db.delete('projects', id)
  notifyDataChanged()
}

/**
 * CSVから読み込んだ案件を保存する。
 * すでに同じIDの案件があれば、CSVに含まれる項目だけを上書きし、画像やURLなど
 * CSVに含まれない項目は元のまま残す。新しいIDなら新規登録として扱う。
 */
export async function importProjectsFromCsv(rows: Project[]): Promise<{ created: number; updated: number }> {
  const db = await getDB()
  let created = 0
  let updated = 0
  for (const row of rows) {
    const existing = await db.get('projects', row.id)
    if (existing) {
      const merged: Project = {
        ...existing,
        implementationDate: row.implementationDate,
        pointSiteId: row.pointSiteId,
        name: row.name,
        status: row.status,
        expectedPoints: row.expectedPoints,
        confirmedPoints: row.confirmedPoints,
        outOfPocketCost: row.outOfPocketCost,
        passbookScheduledDate: row.passbookScheduledDate,
        approvalScheduledDate: row.approvalScheduledDate,
        cancellationDeadline: row.cancellationDeadline,
        cancellationStatus: row.cancellationStatus,
        memo: row.memo,
        updatedAt: new Date().toISOString(),
      }
      await db.put('projects', merged)
      updated++
    } else {
      await db.put('projects', row)
      created++
    }
  }
  notifyDataChanged()
  return { created, updated }
}
