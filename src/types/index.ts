// アプリ全体で使うデータの型定義。
// 画面や保存処理はここで定義した形にそって作る。

export type ProjectStatus =
  | '下書き'
  | '申込済み'
  | '追加作業待ち'
  | '通帳反映待ち'
  | '承認待ち'
  | '付与済み'
  | '非承認'
  | '問い合わせ中'
  | '完了'

export const PROJECT_STATUSES: ProjectStatus[] = [
  '下書き',
  '申込済み',
  '追加作業待ち',
  '通帳反映待ち',
  '承認待ち',
  '付与済み',
  '非承認',
  '問い合わせ中',
  '完了',
]

export type CancellationStatus = '解約不要' | '未解約' | '解約予約済み' | '解約済み'

export const CANCELLATION_STATUSES: CancellationStatus[] = [
  '解約不要',
  '未解約',
  '解約予約済み',
  '解約済み',
]

export type ImageKind = '条件画面' | '申込完了' | 'ポイント付与' | 'その他'

export interface PersonalInfoUsage {
  name: boolean
  email: boolean
  phone: boolean
  address: boolean
  idDocument: boolean
  bankAccount: boolean
}

export interface PointSite {
  id: string
  name: string
  /** 1円に必要なポイント数。未確認の場合は null（勝手に推測しない） */
  pointsPerYen: number | null
  inquiryUrl: string
  memo: string
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface Project {
  id: string
  status: ProjectStatus

  implementationDate: string | null
  pointSiteId: string | null
  name: string
  url: string
  condition: string
  category: string
  userName: string
  memo: string

  expectedPoints: number | null
  confirmedPoints: number | null
  /** サイトの交換率とは別に、この案件で使う交換率（スナップショット・手動修正可） */
  yenPerPointOverride: number | null
  bonusReward: number
  bonusRewardConfirmed: number
  outOfPocketCost: number

  passbookScheduledDate: string | null
  passbookActualDate: string | null
  approvalScheduledDate: string | null
  pointGrantDate: string | null
  cancellationDeadline: string | null
  cancellationStatus: CancellationStatus
  inquiryStatus: string
  inquiryUrl: string

  personalInfoUsage: PersonalInfoUsage
  imageIds: string[]

  createdAt: string
  updatedAt: string
  /** ゴミ箱に入れた日時。nullなら通常表示 */
  deletedAt: string | null
}

export interface ProjectImage {
  id: string
  projectId: string
  kind: ImageKind
  description: string
  blob: Blob
  createdAt: string
}

export type TaskPriority = '高' | '中' | '低'

export interface TaskItem {
  id: string
  projectId: string | null
  title: string
  dueDate: string | null
  priority: TaskPriority
  memo: string
  isDone: boolean
  createdAt: string
  updatedAt: string
}

export interface AppSettings {
  monthlyGoalAmount: number
  userNames: string[]
  categories: string[]
}

export function createEmptyPersonalInfoUsage(): PersonalInfoUsage {
  return {
    name: false,
    email: false,
    phone: false,
    address: false,
    idDocument: false,
    bankAccount: false,
  }
}
