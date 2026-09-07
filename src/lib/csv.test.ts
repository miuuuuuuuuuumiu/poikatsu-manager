import { describe, expect, it } from 'vitest'
import { parseProjectsCsv, projectsToCsv } from './csv'
import { createBlankProject } from './repositories/projects'
import type { PointSite, Project } from '../types'

const SITE: PointSite = {
  id: 'site-1',
  name: 'モッピー',
  pointsPerYen: 10,
  inquiryUrl: '',
  memo: '',
  isActive: true,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
}

function project(overrides: Partial<Project>): Project {
  return { ...createBlankProject(overrides.id ?? 'p-1'), ...overrides }
}

describe('projectsToCsv', () => {
  it('先頭にBOMを付け、日本語ヘッダーで出力する', () => {
    const csv = projectsToCsv([], [])
    expect(csv.charCodeAt(0)).toBe(0xfeff)
    expect(csv).toContain('案件ID,実施日,ポイントサイト,案件名')
  })

  it('カンマや改行を含む値をダブルクォートで囲む', () => {
    const p = project({ id: 'p-1', name: 'テスト,案件', memo: '1行目\n2行目' })
    const csv = projectsToCsv([p], [])
    expect(csv).toContain('"テスト,案件"')
    expect(csv).toContain('"1行目\n2行目"')
  })
})

describe('projectsToCsv → parseProjectsCsv（往復で復元できる）', () => {
  it('出力したCSVを読み込むと、同じ案件IDと主要項目が復元される', () => {
    const original = project({
      id: 'p-123',
      name: '楽天カード新規発行',
      pointSiteId: 'site-1',
      status: '承認待ち',
      implementationDate: '2026-04-01',
      expectedPoints: 8000,
      confirmedPoints: null,
      yenPerPointOverride: 1,
      outOfPocketCost: 0,
      memo: 'テストメモ',
    })

    const csv = projectsToCsv([original], [SITE])
    const [restored] = parseProjectsCsv(csv, [SITE])

    expect(restored.id).toBe('p-123')
    expect(restored.name).toBe('楽天カード新規発行')
    expect(restored.pointSiteId).toBe('site-1')
    expect(restored.status).toBe('承認待ち')
    expect(restored.implementationDate).toBe('2026-04-01')
    expect(restored.expectedPoints).toBe(8000)
    expect(restored.memo).toBe('テストメモ')
  })
})
