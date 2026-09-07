// レポート画面で使う集計処理をここに一本化する。
import type { PointSite, Project } from '../types'
import { calcConfirmedProfit, calcExpectedProfit, calcYenAmount } from './calculations'

export interface MonthlyProfit {
  month: number // 1〜12
  expectedProfit: number
  confirmedProfit: number
}

export interface GroupedProfit {
  key: string
  label: string
  profit: number
  count: number
}

function yearOf(dateStr: string | null): number | null {
  if (!dateStr) return null
  const y = Number(dateStr.slice(0, 4))
  return Number.isNaN(y) ? null : y
}

function monthOf(dateStr: string | null): number | null {
  if (!dateStr) return null
  const m = Number(dateStr.slice(5, 7))
  return Number.isNaN(m) ? null : m
}

/**
 * 実施日の年をもとに、選択肢に出す年の一覧を作る。
 * データがまだ無い年でも選べるように、今年から過去3年分は必ず含める。
 */
export function availableYears(projects: Project[]): number[] {
  const years = new Set<number>()
  const currentYear = new Date().getFullYear()
  for (let y = currentYear - 3; y <= currentYear; y++) {
    years.add(y)
  }
  for (const p of projects) {
    const y = yearOf(p.implementationDate)
    if (y != null) years.add(y)
  }
  return [...years].sort((a, b) => b - a)
}

export function projectsInYear(projects: Project[], year: number): Project[] {
  return projects.filter((p) => yearOf(p.implementationDate) === year)
}

/** 一覧・レポートで「利益」として使う値：確定していればそちら、なければ見込み */
export function displayProfit(project: Project): number {
  return calcConfirmedProfit(project) ?? calcExpectedProfit(project) ?? 0
}

export function monthlyProfits(projects: Project[], year: number): MonthlyProfit[] {
  const result: MonthlyProfit[] = Array.from({ length: 12 }, (_, i) => ({
    month: i + 1,
    expectedProfit: 0,
    confirmedProfit: 0,
  }))
  for (const p of projects) {
    if (yearOf(p.implementationDate) !== year) continue
    const m = monthOf(p.implementationDate)
    if (m == null) continue
    result[m - 1].expectedProfit += calcExpectedProfit(p) ?? 0
    result[m - 1].confirmedProfit += calcConfirmedProfit(p) ?? 0
  }
  return result
}

export function annualConfirmedProfit(projects: Project[], year: number): number {
  return projectsInYear(projects, year).reduce((sum, p) => sum + (calcConfirmedProfit(p) ?? 0), 0)
}

export function totalOutOfPocket(projects: Project[]): number {
  return projects.reduce((sum, p) => sum + p.outOfPocketCost, 0)
}

export function profitBySite(projects: Project[], pointSites: PointSite[]): GroupedProfit[] {
  const nameById = new Map(pointSites.map((s) => [s.id, s.name]))
  const map = new Map<string, GroupedProfit>()
  for (const p of projects) {
    const key = p.pointSiteId ?? '__none__'
    const label = p.pointSiteId ? (nameById.get(p.pointSiteId) ?? '不明なサイト') : 'サイト未設定'
    const entry = map.get(key) ?? { key, label, profit: 0, count: 0 }
    entry.profit += displayProfit(p)
    entry.count += 1
    map.set(key, entry)
  }
  return [...map.values()].sort((a, b) => b.profit - a.profit)
}

export function profitByCategory(projects: Project[]): GroupedProfit[] {
  const map = new Map<string, GroupedProfit>()
  for (const p of projects) {
    const key = p.category || '__none__'
    const label = p.category || 'カテゴリー未設定'
    const entry = map.get(key) ?? { key, label, profit: 0, count: 0 }
    entry.profit += displayProfit(p)
    entry.count += 1
    map.set(key, entry)
  }
  return [...map.values()].sort((a, b) => b.profit - a.profit)
}

/** 非承認になった案件で、失われた（もらえなかった）ポイント・報酬の金額合計 */
export function rejectedAmount(projects: Project[]): number {
  return projects
    .filter((p) => p.status === '非承認')
    .reduce((sum, p) => {
      const yen = calcYenAmount(p.expectedPoints, p.yenPerPointOverride) ?? 0
      return sum + yen + p.bonusReward
    }, 0)
}

/** 承認率＝（付与済み＋完了）÷（付与済み＋完了＋非承認）×100。対象が1件もなければ null（画面で「―」） */
export function approvalRate(projects: Project[]): number | null {
  const approved = projects.filter((p) => p.status === '付与済み' || p.status === '完了').length
  const rejected = projects.filter((p) => p.status === '非承認').length
  const denominator = approved + rejected
  if (denominator === 0) return null
  return Math.round((approved / denominator) * 1000) / 10
}

/**
 * 平均承認日数＝実施日からポイント付与日までの平均日数（付与済み・完了の案件のみ）。
 * 対象が1件もなければ null（画面で「―」）
 */
export function averageApprovalDays(projects: Project[]): number | null {
  const durations: number[] = []
  for (const p of projects) {
    if (p.status !== '付与済み' && p.status !== '完了') continue
    if (!p.implementationDate || !p.pointGrantDate) continue
    const from = new Date(`${p.implementationDate}T00:00:00`)
    const to = new Date(`${p.pointGrantDate}T00:00:00`)
    const days = Math.round((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24))
    if (days >= 0) durations.push(days)
  }
  if (durations.length === 0) return null
  return Math.round((durations.reduce((sum, d) => sum + d, 0) / durations.length) * 10) / 10
}
