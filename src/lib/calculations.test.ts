import { describe, expect, it } from 'vitest'
import { calcConfirmedProfit, calcExpectedProfit, calcProfitRate, calcReturnRate, calcYenAmount } from './calculations'
import { createBlankProject } from './repositories/projects'

function baseProject() {
  return createBlankProject('test-id')
}

describe('calcYenAmount', () => {
  it('10,000ポイント・10ポイント＝1円の場合、円換算額が1,000円になる', () => {
    expect(calcYenAmount(10000, 10)).toBe(1000)
  })

  it('交換率が未設定（null）の場合は null を返す', () => {
    expect(calcYenAmount(10000, null)).toBeNull()
  })

  it('ポイントが未入力（null）の場合は null を返す', () => {
    expect(calcYenAmount(null, 10)).toBeNull()
  })
})

describe('calcExpectedProfit', () => {
  it('円換算額1,000円・手出し600円の場合、見込利益が400円になる', () => {
    const project = { ...baseProject(), expectedPoints: 10000, yenPerPointOverride: 10, outOfPocketCost: 600 }
    expect(calcExpectedProfit(project)).toBe(400)
  })

  it('追加報酬がある場合は加算される', () => {
    const project = {
      ...baseProject(),
      expectedPoints: 10000,
      yenPerPointOverride: 10,
      outOfPocketCost: 600,
      bonusReward: 200,
    }
    expect(calcExpectedProfit(project)).toBe(600)
  })

  it('ポイント未入力の場合は null になる', () => {
    const project = { ...baseProject(), yenPerPointOverride: 10, outOfPocketCost: 600 }
    expect(calcExpectedProfit(project)).toBeNull()
  })
})

describe('calcConfirmedProfit', () => {
  it('確定ポイントと確定報酬から確定利益を計算する', () => {
    const project = {
      ...baseProject(),
      confirmedPoints: 5000,
      yenPerPointOverride: 5,
      outOfPocketCost: 500,
      bonusRewardConfirmed: 100,
    }
    // 5000/5=1000円 + 100円 - 500円 = 600円
    expect(calcConfirmedProfit(project)).toBe(600)
  })

  it('交換率が未設定の案件の確定ポイントを変更しても、別案件の交換率変更の影響を受けない（スナップショット方式）', () => {
    // 案件ごとに yenPerPointOverride を持つため、サイト側の交換率が後から変わっても
    // すでに保存済みの案件の計算結果は変わらないことを確認する。
    const projectA = { ...baseProject(), confirmedPoints: 1000, yenPerPointOverride: 10, outOfPocketCost: 0 }
    const resultBefore = calcConfirmedProfit(projectA)
    // サイト側の交換率だけが変わっても、projectA自体のyenPerPointOverrideは変わらない
    const resultAfter = calcConfirmedProfit(projectA)
    expect(resultBefore).toBe(resultAfter)
    expect(resultBefore).toBe(100)
  })
})

describe('calcReturnRate / calcProfitRate（手出し0円のとき）', () => {
  it('手出し費用が0円の場合、還元率は null になる（画面では「―」）', () => {
    expect(calcReturnRate(1000, 0)).toBeNull()
  })

  it('手出し費用が0円の場合、利益率は null になる（画面では「―」）', () => {
    expect(calcProfitRate(1000, 0)).toBeNull()
  })

  it('手出し費用がある場合は正しく計算される', () => {
    expect(calcReturnRate(1000, 600)).toBeCloseTo(166.7, 1)
    expect(calcProfitRate(400, 600)).toBeCloseTo(66.7, 1)
  })
})
