import type { Project } from '../../types'
import {
  calcConfirmedProfit,
  calcExpectedProfit,
  calcProfitRate,
  calcReturnRate,
  calcYenAmount,
  formatRateOrDash,
  formatYenOrDash,
} from '../../lib/calculations'

/** 案件登録・編集画面の「ポイント・費用」セクションに表示する、自動計算まとめ */
export function ProfitSummary({ project }: { project: Project }) {
  const expectedYen = calcYenAmount(project.expectedPoints, project.yenPerPointOverride)
  const expectedProfit = calcExpectedProfit(project)
  const expectedReturnRate = calcReturnRate(expectedYen, project.outOfPocketCost)
  const expectedProfitRate = calcProfitRate(expectedProfit, project.outOfPocketCost)

  const confirmedYen = calcYenAmount(project.confirmedPoints, project.yenPerPointOverride)
  const confirmedProfit = calcConfirmedProfit(project)
  const confirmedReturnRate = calcReturnRate(confirmedYen, project.outOfPocketCost)
  const confirmedProfitRate = calcProfitRate(confirmedProfit, project.outOfPocketCost)

  return (
    <div className="space-y-3">
      <div className="rounded-xl bg-[var(--color-green)] p-3">
        <p className="mb-2 text-xs font-bold text-[var(--color-green-text)]">見込み（獲得予定ポイントから計算）</p>
        <Row label="円換算額" value={formatYenOrDash(expectedYen)} />
        <Row label="見込利益" value={formatYenOrDash(expectedProfit)} emphasis />
        <Row label="還元率" value={formatRateOrDash(expectedReturnRate)} />
        <Row label="利益率" value={formatRateOrDash(expectedProfitRate)} />
      </div>
      <div className="rounded-xl bg-[var(--color-beige)] p-3">
        <p className="mb-2 text-xs font-bold text-[var(--color-ink)]">確定（確定ポイントから計算）</p>
        <Row label="円換算額" value={formatYenOrDash(confirmedYen)} />
        <Row label="確定利益" value={formatYenOrDash(confirmedProfit)} emphasis />
        <Row label="還元率" value={formatRateOrDash(confirmedReturnRate)} />
        <Row label="利益率" value={formatRateOrDash(confirmedProfitRate)} />
      </div>
      {project.pointSiteId && project.yenPerPointOverride == null && (
        <p className="text-xs text-[var(--color-warn-text)]">
          このポイントサイトはまだ交換率が未設定です。設定画面のポイントサイト管理から入力すると計算されます。
        </p>
      )}
    </div>
  )
}

function Row({ label, value, emphasis = false }: { label: string; value: string; emphasis?: boolean }) {
  return (
    <div className="flex items-center justify-between py-0.5">
      <span className="text-xs text-[var(--color-ink-soft)]">{label}</span>
      <span className={emphasis ? 'text-base font-extrabold' : 'text-sm font-bold'}>{value}</span>
    </div>
  )
}
