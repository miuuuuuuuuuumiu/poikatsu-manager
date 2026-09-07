import { describe, expect, it } from 'vitest'
import { createBlankProject } from './repositories/projects'
import type { Project } from '../types'
import {
  approvalRate,
  averageApprovalDays,
  monthlyProfits,
  profitByCategory,
  profitBySite,
  rejectedAmount,
} from './reportAggregations'

function project(overrides: Partial<Project>): Project {
  return { ...createBlankProject(overrides.id ?? crypto.randomUUID()), ...overrides }
}

describe('monthlyProfits', () => {
  it('実施日の月に、見込利益・確定利益を集計する', () => {
    const projects = [
      project({ implementationDate: '2026-04-01', expectedPoints: 1000, yenPerPointOverride: 1, outOfPocketCost: 0 }),
      project({ implementationDate: '2026-04-15', confirmedPoints: 500, yenPerPointOverride: 1, outOfPocketCost: 0 }),
      project({ implementationDate: '2025-04-01', expectedPoints: 9999, yenPerPointOverride: 1, outOfPocketCost: 0 }),
    ]
    const result = monthlyProfits(projects, 2026)
    expect(result).toHaveLength(12)
    expect(result[3].month).toBe(4)
    expect(result[3].expectedProfit).toBe(1000)
    expect(result[3].confirmedProfit).toBe(500)
    // 他の月は0円
    expect(result[0].expectedProfit).toBe(0)
  })
})

describe('profitBySite / profitByCategory', () => {
  it('サイトごと・カテゴリーごとに利益と件数を集計する', () => {
    const projects = [
      project({ pointSiteId: 'siteA', category: 'クレジットカード', confirmedPoints: 1000, yenPerPointOverride: 1 }),
      project({ pointSiteId: 'siteA', category: '口座開設', confirmedPoints: 500, yenPerPointOverride: 1 }),
      project({ pointSiteId: 'siteB', category: 'クレジットカード', confirmedPoints: 200, yenPerPointOverride: 1 }),
    ]
    const bySite = profitBySite(projects, [
      { id: 'siteA', name: 'サイトA', pointsPerYen: 1, inquiryUrl: '', memo: '', isActive: true, createdAt: '', updatedAt: '' },
      { id: 'siteB', name: 'サイトB', pointsPerYen: 1, inquiryUrl: '', memo: '', isActive: true, createdAt: '', updatedAt: '' },
    ])
    expect(bySite[0]).toEqual({ key: 'siteA', label: 'サイトA', profit: 1500, count: 2 })
    expect(bySite[1]).toEqual({ key: 'siteB', label: 'サイトB', profit: 200, count: 1 })

    const byCategory = profitByCategory(projects)
    const cc = byCategory.find((c) => c.label === 'クレジットカード')
    expect(cc).toEqual({ key: 'クレジットカード', label: 'クレジットカード', profit: 1200, count: 2 })
  })
})

describe('rejectedAmount', () => {
  it('非承認の案件だけ、失われた金額を合計する', () => {
    const projects = [
      project({ status: '非承認', expectedPoints: 1000, yenPerPointOverride: 1, bonusReward: 100 }),
      project({ status: '承認待ち', expectedPoints: 9999, yenPerPointOverride: 1 }),
    ]
    expect(rejectedAmount(projects)).toBe(1100)
  })
})

describe('approvalRate', () => {
  it('付与済み・完了と非承認の比率から承認率を計算する', () => {
    const projects = [
      project({ status: '付与済み' }),
      project({ status: '完了' }),
      project({ status: '非承認' }),
    ]
    expect(approvalRate(projects)).toBeCloseTo(66.7, 1)
  })

  it('対象が0件なら null', () => {
    expect(approvalRate([project({ status: '下書き' })])).toBeNull()
  })
})

describe('averageApprovalDays', () => {
  it('実施日からポイント付与日までの平均日数を計算する', () => {
    const projects = [
      project({ status: '完了', implementationDate: '2026-01-01', pointGrantDate: '2026-01-08' }), // 7日
      project({ status: '付与済み', implementationDate: '2026-02-01', pointGrantDate: '2026-02-04' }), // 3日
    ]
    expect(averageApprovalDays(projects)).toBe(5)
  })

  it('対象が0件なら null', () => {
    expect(averageApprovalDays([project({ status: '下書き' })])).toBeNull()
  })
})
