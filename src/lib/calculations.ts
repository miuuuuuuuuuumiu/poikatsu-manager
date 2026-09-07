// 金額の計算はすべてここに集約する。画面ごとに計算式がバラバラになって
// 表示金額がズレることを防ぐため、他の場所では計算式を直接書かず、この関数を呼び出す。
import type { Project } from '../types'

/** 円未満は四捨五入する（このアプリ全体の丸めルール） */
export function roundYen(value: number): number {
  return Math.round(value)
}

/** 割合は小数第1位までに丸める（例: 166.7%） */
function roundRate(value: number): number {
  return Math.round(value * 10) / 10
}

/**
 * ポイントを円に換算する。
 * 交換率が決まっていない場合は null を返す（0円と混同しないため）。
 */
export function calcYenAmount(points: number | null, pointsPerYen: number | null): number | null {
  if (points == null || pointsPerYen == null || pointsPerYen <= 0) return null
  return roundYen(points / pointsPerYen)
}

/** 見込利益＝獲得予定ポイントの円換算額＋追加報酬（見込）－手出し費用 */
export function calcExpectedProfit(project: Project): number | null {
  const yenAmount = calcYenAmount(project.expectedPoints, project.yenPerPointOverride)
  if (yenAmount == null) return null
  return roundYen(yenAmount + project.bonusReward - project.outOfPocketCost)
}

/** 確定利益＝確定ポイントの円換算額＋追加報酬（確定）－手出し費用 */
export function calcConfirmedProfit(project: Project): number | null {
  const yenAmount = calcYenAmount(project.confirmedPoints, project.yenPerPointOverride)
  if (yenAmount == null) return null
  return roundYen(yenAmount + project.bonusRewardConfirmed - project.outOfPocketCost)
}

/**
 * 還元率＝ポイント円換算額÷手出し費用×100
 * 手出し費用が0円、またはまだ円換算額が計算できない場合は null（画面側で「―」と表示する）
 */
export function calcReturnRate(yenAmount: number | null, outOfPocketCost: number): number | null {
  if (yenAmount == null || outOfPocketCost === 0) return null
  return roundRate((yenAmount / outOfPocketCost) * 100)
}

/**
 * 利益率＝実質利益÷手出し費用×100
 * 手出し費用が0円、または利益がまだ計算できない場合は null（画面側で「―」と表示する）
 */
export function calcProfitRate(profit: number | null, outOfPocketCost: number): number | null {
  if (profit == null || outOfPocketCost === 0) return null
  return roundRate((profit / outOfPocketCost) * 100)
}

/** 画面表示用：null なら「―」、それ以外は「1,234円」の形式にする */
export function formatYenOrDash(value: number | null): string {
  if (value == null) return '―'
  return `${value.toLocaleString()}円`
}

/** 画面表示用：null なら「―」、それ以外は「12.3%」の形式にする */
export function formatRateOrDash(value: number | null): string {
  if (value == null) return '―'
  return `${value}%`
}
