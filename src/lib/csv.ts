// CSVの読み書きはここに一本化する。
// Excelで開いたときに日本語が文字化けしないよう、書き出す文字列の先頭にBOM（目に見えない印）を付ける。
import { createBlankProject } from './repositories/projects'
import { calcConfirmedProfit, calcExpectedProfit, calcYenAmount } from './calculations'
import type { CancellationStatus, PointSite, Project, ProjectStatus } from '../types'
import { CANCELLATION_STATUSES, PROJECT_STATUSES } from '../types'

export const CSV_HEADERS = [
  '案件ID',
  '実施日',
  'ポイントサイト',
  '案件名',
  'ステータス',
  '獲得予定ポイント',
  '確定ポイント',
  '円換算額',
  '手出し費用',
  '見込利益',
  '確定利益',
  '通帳反映予定日',
  '承認予定日',
  '解約期限',
  '解約状況',
  'メモ',
  '登録日時',
  '更新日時',
] as const

function escapeCsvField(value: string): string {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`
  }
  return value
}

function toCsvRow(values: (string | number | null)[]): string {
  return values.map((v) => escapeCsvField(v == null ? '' : String(v))).join(',')
}

export function projectsToCsv(projects: Project[], pointSites: PointSite[]): string {
  const siteNameById = new Map(pointSites.map((s) => [s.id, s.name]))
  const lines = [toCsvRow([...CSV_HEADERS])]

  for (const p of projects) {
    const yenAmount = calcYenAmount(p.confirmedPoints, p.yenPerPointOverride) ?? calcYenAmount(p.expectedPoints, p.yenPerPointOverride)
    lines.push(
      toCsvRow([
        p.id,
        p.implementationDate,
        p.pointSiteId ? (siteNameById.get(p.pointSiteId) ?? '') : '',
        p.name,
        p.status,
        p.expectedPoints,
        p.confirmedPoints,
        yenAmount,
        p.outOfPocketCost,
        calcExpectedProfit(p),
        calcConfirmedProfit(p),
        p.passbookScheduledDate,
        p.approvalScheduledDate,
        p.cancellationDeadline,
        p.cancellationStatus,
        p.memo,
        p.createdAt,
        p.updatedAt,
      ]),
    )
  }

  // Excelで文字化けしないよう、先頭にBOMを付ける。改行はExcel/Windowsに合わせてCRLFにする。
  return '﻿' + lines.join('\r\n')
}

/** シンプルなCSVパーサー（ダブルクォート・カンマ・改行を含むセルに対応） */
function parseCsvLines(text: string): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let field = ''
  let inQuotes = false

  const body = text.startsWith('﻿') ? text.slice(1) : text

  for (let i = 0; i < body.length; i++) {
    const char = body[i]
    if (inQuotes) {
      if (char === '"') {
        if (body[i + 1] === '"') {
          field += '"'
          i++
        } else {
          inQuotes = false
        }
      } else {
        field += char
      }
      continue
    }

    if (char === '"') {
      inQuotes = true
    } else if (char === ',') {
      row.push(field)
      field = ''
    } else if (char === '\n' || char === '\r') {
      if (char === '\r' && body[i + 1] === '\n') i++
      row.push(field)
      rows.push(row)
      row = []
      field = ''
    } else {
      field += char
    }
  }
  if (field !== '' || row.length > 0) {
    row.push(field)
    rows.push(row)
  }
  return rows.filter((r) => r.some((cell) => cell !== ''))
}

/**
 * CSVを読み込み、案件データに変換する。
 * 案件ID・案件名・ステータスなど、案件登録・編集画面で使う項目だけを復元する
 * （画像やポイントサイトの交換率など、CSVに含まれない項目は元の値のまま、または空のまま）。
 */
export function parseProjectsCsv(text: string, pointSites: PointSite[]): Project[] {
  const rows = parseCsvLines(text)
  if (rows.length === 0) return []

  const header = rows[0]
  const idx = (name: string) => header.indexOf(name)
  const siteIdByName = new Map(pointSites.map((s) => [s.name, s.id]))

  const iId = idx('案件ID')
  const iDate = idx('実施日')
  const iSite = idx('ポイントサイト')
  const iName = idx('案件名')
  const iStatus = idx('ステータス')
  const iExpectedPoints = idx('獲得予定ポイント')
  const iConfirmedPoints = idx('確定ポイント')
  const iOutOfPocket = idx('手出し費用')
  const iPassbookScheduled = idx('通帳反映予定日')
  const iApprovalScheduled = idx('承認予定日')
  const iCancellationDeadline = idx('解約期限')
  const iCancellationStatus = idx('解約状況')
  const iMemo = idx('メモ')
  const iCreatedAt = idx('登録日時')
  const iUpdatedAt = idx('更新日時')

  const results: Project[] = []
  for (let r = 1; r < rows.length; r++) {
    const cols = rows[r]
    const id = iId >= 0 ? cols[iId] : ''
    if (!id) continue

    const base = createBlankProject(id)
    const status = cols[iStatus] as ProjectStatus
    const cancellationStatus = cols[iCancellationStatus] as CancellationStatus

    const project: Project = {
      ...base,
      implementationDate: (iDate >= 0 && cols[iDate]) || null,
      pointSiteId: (iSite >= 0 && siteIdByName.get(cols[iSite])) || null,
      name: iName >= 0 ? cols[iName] : '',
      status: PROJECT_STATUSES.includes(status) ? status : base.status,
      expectedPoints: iExpectedPoints >= 0 && cols[iExpectedPoints] !== '' ? Number(cols[iExpectedPoints]) : null,
      confirmedPoints: iConfirmedPoints >= 0 && cols[iConfirmedPoints] !== '' ? Number(cols[iConfirmedPoints]) : null,
      outOfPocketCost: iOutOfPocket >= 0 && cols[iOutOfPocket] !== '' ? Number(cols[iOutOfPocket]) : 0,
      passbookScheduledDate: (iPassbookScheduled >= 0 && cols[iPassbookScheduled]) || null,
      approvalScheduledDate: (iApprovalScheduled >= 0 && cols[iApprovalScheduled]) || null,
      cancellationDeadline: (iCancellationDeadline >= 0 && cols[iCancellationDeadline]) || null,
      cancellationStatus: CANCELLATION_STATUSES.includes(cancellationStatus) ? cancellationStatus : base.cancellationStatus,
      memo: iMemo >= 0 ? cols[iMemo] : '',
      createdAt: (iCreatedAt >= 0 && cols[iCreatedAt]) || base.createdAt,
      updatedAt: (iUpdatedAt >= 0 && cols[iUpdatedAt]) || base.updatedAt,
    }
    results.push(project)
  }
  return results
}
