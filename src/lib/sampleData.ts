// お試し用のサンプル案件データ。名前の先頭に「【サンプル】」を付けて、
// 通常の案件と区別し、後から確実に見分けて削除できるようにしている。
import { getDB } from './db'
import { createBlankProject } from './repositories/projects'
import { listPointSites } from './repositories/pointSites'
import { generateId } from './generateId'
import type { Project, ProjectStatus } from '../types'

const SAMPLE_PREFIX = '【サンプル】'

function addDays(days: number): string {
  const d = new Date()
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}

interface SampleSpec {
  name: string
  siteName: string
  category: string
  status: ProjectStatus
  implementationDaysAgo: number
  expectedPoints: number | null
  confirmedPoints: number | null
  yenPerPointOverride: number | null
  outOfPocketCost: number
  approvalScheduledOffset?: number
  cancellationDeadlineOffset?: number
  cancellationStatus?: Project['cancellationStatus']
  pointGrantOffset?: number
  inquiryStatus?: string
}

const SAMPLE_SPECS: SampleSpec[] = [
  {
    name: '楽天カード新規発行',
    siteName: 'ハピタス',
    category: 'クレジットカード',
    status: '承認待ち',
    implementationDaysAgo: 10,
    expectedPoints: 8000,
    confirmedPoints: null,
    yenPerPointOverride: 1,
    outOfPocketCost: 0,
    approvalScheduledOffset: -3, // 期限超過（承認予定日を過ぎている）
  },
  {
    name: '証券口座開設＋入金',
    siteName: 'モッピー',
    category: '証券・投資',
    status: '追加作業待ち',
    implementationDaysAgo: 5,
    expectedPoints: 12000,
    confirmedPoints: null,
    yenPerPointOverride: 10,
    outOfPocketCost: 5000,
  },
  {
    name: '動画配信サービス無料体験',
    siteName: 'ポイントインカム',
    category: '動画視聴',
    status: '申込済み',
    implementationDaysAgo: 1,
    expectedPoints: 3000,
    confirmedPoints: null,
    yenPerPointOverride: 10,
    outOfPocketCost: 0,
    cancellationDeadlineOffset: 2, // 3日以内に解約期限
    cancellationStatus: '未解約',
  },
  {
    name: '資料請求キャンペーン',
    siteName: 'ワラウ',
    category: '資料請求',
    status: '非承認',
    implementationDaysAgo: 20,
    expectedPoints: 500,
    confirmedPoints: 0,
    yenPerPointOverride: 1,
    outOfPocketCost: 0,
  },
  {
    name: 'クレジットカード発行（家族カード含む）',
    siteName: 'ちょびリッチ',
    category: 'クレジットカード',
    status: '問い合わせ中',
    implementationDaysAgo: 15,
    expectedPoints: 15000,
    confirmedPoints: null,
    yenPerPointOverride: 10,
    outOfPocketCost: 0,
    inquiryStatus: '非承認の理由を問い合わせ中',
  },
  {
    name: 'FX口座開設＋取引',
    siteName: 'ポイントタウン',
    category: '証券・投資',
    status: '付与済み',
    implementationDaysAgo: 40,
    expectedPoints: 20000,
    confirmedPoints: 20000,
    yenPerPointOverride: 10,
    outOfPocketCost: 0,
    pointGrantOffset: -5,
  },
  {
    name: 'アンケートモニター登録',
    siteName: 'すぐたま',
    category: 'アンケート',
    status: '完了',
    implementationDaysAgo: 60,
    expectedPoints: 300,
    confirmedPoints: 300,
    yenPerPointOverride: 1,
    outOfPocketCost: 0,
    pointGrantOffset: -55,
  },
  {
    name: '美容クリニックカウンセリング予約',
    siteName: 'げっとま',
    category: '美容・健康',
    status: '通帳反映待ち',
    implementationDaysAgo: 8,
    expectedPoints: 6000,
    confirmedPoints: null,
    yenPerPointOverride: 10,
    outOfPocketCost: 0,
  },
  {
    name: '光回線 新規契約',
    siteName: 'アメフリ',
    category: '通信・光回線',
    status: '承認待ち',
    implementationDaysAgo: 2,
    expectedPoints: 30000,
    confirmedPoints: null,
    yenPerPointOverride: 10,
    outOfPocketCost: 3000,
    approvalScheduledOffset: 5,
  },
  {
    name: '入会金無料キャンペーン（下書き中）',
    siteName: 'ECナビ',
    category: '会員登録',
    status: '下書き',
    implementationDaysAgo: 0,
    expectedPoints: null,
    confirmedPoints: null,
    yenPerPointOverride: null,
    outOfPocketCost: 0,
  },
]

export async function insertSampleProjects(): Promise<number> {
  const sites = await listPointSites()
  const siteIdByName = new Map(sites.map((s) => [s.name, s.id]))
  const db = await getDB()

  const tx = db.transaction('projects', 'readwrite')
  for (const spec of SAMPLE_SPECS) {
    const id = generateId()
    const project: Project = {
      ...createBlankProject(id),
      name: `${SAMPLE_PREFIX}${spec.name}`,
      pointSiteId: siteIdByName.get(spec.siteName) ?? null,
      category: spec.category,
      status: spec.status,
      implementationDate: addDays(-spec.implementationDaysAgo),
      expectedPoints: spec.expectedPoints,
      confirmedPoints: spec.confirmedPoints,
      yenPerPointOverride: spec.yenPerPointOverride,
      outOfPocketCost: spec.outOfPocketCost,
      approvalScheduledDate: spec.approvalScheduledOffset != null ? addDays(spec.approvalScheduledOffset) : null,
      cancellationDeadline: spec.cancellationDeadlineOffset != null ? addDays(spec.cancellationDeadlineOffset) : null,
      cancellationStatus: spec.cancellationStatus ?? '解約不要',
      pointGrantDate: spec.pointGrantOffset != null ? addDays(spec.pointGrantOffset) : null,
      inquiryStatus: spec.inquiryStatus ?? '',
    }
    await tx.store.put(project)
  }
  await tx.done
  return SAMPLE_SPECS.length
}

export async function deleteSampleProjects(): Promise<number> {
  const db = await getDB()
  const all = await db.getAll('projects')
  const samples = all.filter((p) => p.name.startsWith(SAMPLE_PREFIX))
  const tx = db.transaction('projects', 'readwrite')
  for (const p of samples) await tx.store.delete(p.id)
  await tx.done
  return samples.length
}
