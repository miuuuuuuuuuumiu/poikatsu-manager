import { useEffect, useRef, useState, type ReactNode } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { AppShell } from '../components/layout/AppShell'
import { Card } from '../components/common/Card'
import { AutoResizeTextarea } from '../components/common/AutoResizeTextarea'
import { SaveStatusIndicator } from '../components/common/SaveStatusIndicator'
import { ConfirmDialog } from '../components/common/ConfirmDialog'
import { EvidenceImages } from '../components/project/EvidenceImages'
import { ProfitSummary } from '../components/project/ProfitSummary'
import { useAutosave } from '../hooks/useAutosave'
import { createBlankProject, getProject, moveProjectToTrash, saveProject } from '../lib/repositories/projects'
import { listPointSites } from '../lib/repositories/pointSites'
import { listProjectImages } from '../lib/repositories/images'
import { DEFAULT_CATEGORIES } from '../lib/constants'
import { generateId } from '../lib/generateId'
import { CANCELLATION_STATUSES, PROJECT_STATUSES, type PersonalInfoUsage, type PointSite, type Project, type ProjectImage } from '../types'

const SECTIONS = ['基本情報', 'ポイント・費用', '進捗管理', '証拠画像', '個人情報の確認'] as const

/** URLのidが変わるたびに中身をまっさらに作り直すための外側コンポーネント */
export function ProjectFormPage() {
  const { id } = useParams()
  return <ProjectFormInner key={id ?? 'new'} />
}

function ProjectFormInner() {
  const { id: routeId } = useParams()
  const navigate = useNavigate()
  const isNew = !routeId || routeId === 'new'

  const [projectId] = useState(() => (routeId && routeId !== 'new' ? routeId : generateId()))
  const [project, setProject] = useState<Project | null>(null)
  const [images, setImages] = useState<ProjectImage[]>([])
  const [pointSites, setPointSites] = useState<PointSite[]>([])
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [dirty, setDirty] = useState(false)
  const [section, setSection] = useState<(typeof SECTIONS)[number]>('基本情報')
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false)
  const urlSyncedRef = useRef(false)

  useEffect(() => {
    let cancelled = false
    async function load() {
      const sites = await listPointSites()
      if (cancelled) return
      setPointSites(sites)

      if (isNew) {
        setProject(createBlankProject(projectId))
      } else {
        const existing = await getProject(projectId)
        if (cancelled) return
        if (!existing) {
          setNotFound(true)
          setLoading(false)
          return
        }
        setProject(existing)
        const imgs = await listProjectImages(projectId)
        if (!cancelled) setImages(imgs)
      }
      if (!cancelled) setLoading(false)
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [isNew, projectId])

  // この案件の交換率がまだ一度も決まっていない場合、ポイントサイト側に交換率が
  // 設定されていればそれを自動で反映する。すでに何か値が入っている場合は上書きしない
  // （設定画面で後からサイトの交換率を変えても、過去の確定金額は変わらないようにするため）。
  useEffect(() => {
    if (!project || project.yenPerPointOverride !== null || !project.pointSiteId) return
    const site = pointSites.find((s) => s.id === project.pointSiteId)
    if (site?.pointsPerYen == null) return
    setDirty(true)
    setProject((prev) => (prev ? { ...prev, yenPerPointOverride: site.pointsPerYen } : prev))
  }, [project, pointSites])

  const { status: saveStatus, errorMessage: saveError } = useAutosave(
    project,
    async (value) => {
      if (!value) return
      await saveProject(value)
      if (isNew && !urlSyncedRef.current) {
        urlSyncedRef.current = true
        navigate(`/projects/${projectId}`, { replace: true })
      }
    },
    { enabled: dirty && project !== null },
  )

  function updateField<K extends keyof Project>(key: K, value: Project[K]) {
    setDirty(true)
    setProject((prev) => (prev ? { ...prev, [key]: value } : prev))
  }

  function updatePersonalInfo<K extends keyof PersonalInfoUsage>(key: K, value: boolean) {
    setDirty(true)
    setProject((prev) => (prev ? { ...prev, personalInfoUsage: { ...prev.personalInfoUsage, [key]: value } } : prev))
  }

  // 画像だけを追加/削除した場合でも、案件本体を必ず保存する。
  // そうしないと新規登録画面でIDが確定せず、リロード時に画像とはぐれてしまう。
  function handleImagesChange(nextImages: ProjectImage[]) {
    setDirty(true)
    setImages(nextImages)
    setProject((prev) => (prev ? { ...prev, imageIds: nextImages.map((img) => img.id) } : prev))
  }

  function handlePointSiteChange(siteId: string) {
    // 交換率の自動反映は上のuseEffectが担当する（サイト選択直後・後からサイト側の交換率が
    // 設定された場合のどちらにも対応するため）。ここではサイトの選択だけを更新する。
    updateField('pointSiteId', siteId || null)
  }

  async function handleConfirmDelete() {
    setConfirmDeleteOpen(false)
    await moveProjectToTrash(projectId)
    navigate('/projects', { replace: true })
  }

  if (notFound) {
    return (
      <AppShell title="案件が見つかりません">
        <p className="text-sm text-[var(--color-ink-soft)]">この案件は削除されたか、URLが正しくない可能性があります。</p>
      </AppShell>
    )
  }

  if (loading || !project) {
    return (
      <AppShell title={isNew ? '案件を登録' : '案件を編集'}>
        <p className="text-sm text-[var(--color-ink-soft)]">読み込み中…</p>
      </AppShell>
    )
  }

  return (
    <AppShell title={isNew ? '案件を登録' : '案件を編集'}>
      <div className="space-y-4">
        <SaveStatusIndicator status={dirty ? saveStatus : 'idle'} errorMessage={saveError} />

        <div className="flex gap-2 overflow-x-auto pb-1 text-sm">
          {SECTIONS.map((s) => (
            <button
              key={s}
              onClick={() => setSection(s)}
              className={`shrink-0 rounded-full px-3 py-1.5 font-bold ${
                section === s
                  ? 'bg-[var(--color-green-dark)] text-white'
                  : 'border border-[var(--color-line)] bg-[var(--color-surface)] text-[var(--color-ink-soft)]'
              }`}
            >
              {s}
            </button>
          ))}
        </div>

        {section === '基本情報' && (
          <Card className="space-y-3">
            <Field label="実施日">
              <input
                type="date"
                value={project.implementationDate ?? ''}
                onChange={(e) => updateField('implementationDate', e.target.value || null)}
                className={inputClass}
              />
            </Field>
            <Field label="ポイントサイト">
              <select
                value={project.pointSiteId ?? ''}
                onChange={(e) => handlePointSiteChange(e.target.value)}
                className={inputClass}
              >
                <option value="">選択してください</option>
                {pointSites.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="案件名">
              <input
                type="text"
                placeholder="例：楽天カード新規発行"
                value={project.name}
                onChange={(e) => updateField('name', e.target.value)}
                className={inputClass}
              />
            </Field>
            <Field label="案件URL">
              <input
                type="url"
                placeholder="https://"
                value={project.url}
                onChange={(e) => updateField('url', e.target.value)}
                className={inputClass}
              />
            </Field>
            <Field label="達成条件">
              <AutoResizeTextarea rows={2} value={project.condition} onChange={(e) => updateField('condition', e.target.value)} className={inputClass} />
            </Field>
            <Field label="案件カテゴリー">
              <select value={project.category} onChange={(e) => updateField('category', e.target.value)} className={inputClass}>
                <option value="">選択してください</option>
                {DEFAULT_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="利用者名">
              <input type="text" value={project.userName} onChange={(e) => updateField('userName', e.target.value)} className={inputClass} />
            </Field>
            <Field label="メモ">
              <AutoResizeTextarea rows={2} value={project.memo} onChange={(e) => updateField('memo', e.target.value)} className={inputClass} />
            </Field>
          </Card>
        )}

        {section === 'ポイント・費用' && (
          <Card className="space-y-3">
            <Field label="獲得予定ポイント">
              <input
                type="number"
                inputMode="numeric"
                value={project.expectedPoints ?? ''}
                onChange={(e) => updateField('expectedPoints', parseNullableNumber(e.target.value))}
                className={inputClass}
              />
            </Field>
            <Field label="確定ポイント">
              <input
                type="number"
                inputMode="numeric"
                value={project.confirmedPoints ?? ''}
                onChange={(e) => updateField('confirmedPoints', parseNullableNumber(e.target.value))}
                className={inputClass}
              />
            </Field>
            <Field label="この案件で使う交換率（○ポイント＝1円）">
              <input
                type="number"
                inputMode="numeric"
                value={project.yenPerPointOverride ?? ''}
                onChange={(e) => updateField('yenPerPointOverride', parseNullableNumber(e.target.value))}
                className={inputClass}
              />
              <p className="mt-1 text-xs text-[var(--color-ink-soft)]">
                ポイントサイトを選ぶと自動で入ります。この案件だけ違う場合はここで修正できます。
              </p>
            </Field>
            <Field label="追加報酬（現金・ギフト券など・見込）">
              <input
                type="number"
                inputMode="numeric"
                value={project.bonusReward}
                onChange={(e) => updateField('bonusReward', parseNumber(e.target.value))}
                className={inputClass}
              />
            </Field>
            <Field label="追加報酬（確定）">
              <input
                type="number"
                inputMode="numeric"
                value={project.bonusRewardConfirmed}
                onChange={(e) => updateField('bonusRewardConfirmed', parseNumber(e.target.value))}
                className={inputClass}
              />
            </Field>
            <Field label="手出し費用">
              <input
                type="number"
                inputMode="numeric"
                value={project.outOfPocketCost}
                onChange={(e) => updateField('outOfPocketCost', parseNumber(e.target.value))}
                className={inputClass}
              />
            </Field>
            <ProfitSummary project={project} />
          </Card>
        )}

        {section === '進捗管理' && (
          <Card className="space-y-3">
            <Field label="案件ステータス">
              <select value={project.status} onChange={(e) => updateField('status', e.target.value as Project['status'])} className={inputClass}>
                {PROJECT_STATUSES.map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </Field>
            <Field label="通帳反映予定日">
              <input
                type="date"
                value={project.passbookScheduledDate ?? ''}
                onChange={(e) => updateField('passbookScheduledDate', e.target.value || null)}
                className={inputClass}
              />
            </Field>
            <Field label="通帳反映日">
              <input
                type="date"
                value={project.passbookActualDate ?? ''}
                onChange={(e) => updateField('passbookActualDate', e.target.value || null)}
                className={inputClass}
              />
            </Field>
            <Field label="承認予定日">
              <input
                type="date"
                value={project.approvalScheduledDate ?? ''}
                onChange={(e) => updateField('approvalScheduledDate', e.target.value || null)}
                className={inputClass}
              />
            </Field>
            <Field label="ポイント付与日">
              <input
                type="date"
                value={project.pointGrantDate ?? ''}
                onChange={(e) => updateField('pointGrantDate', e.target.value || null)}
                className={inputClass}
              />
            </Field>
            <Field label="解約期限">
              <input
                type="date"
                value={project.cancellationDeadline ?? ''}
                onChange={(e) => updateField('cancellationDeadline', e.target.value || null)}
                className={inputClass}
              />
            </Field>
            <Field label="解約状況">
              <select
                value={project.cancellationStatus}
                onChange={(e) => updateField('cancellationStatus', e.target.value as Project['cancellationStatus'])}
                className={inputClass}
              >
                {CANCELLATION_STATUSES.map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </Field>
            <Field label="問い合わせ状況">
              <input type="text" value={project.inquiryStatus} onChange={(e) => updateField('inquiryStatus', e.target.value)} className={inputClass} />
            </Field>
            <Field label="問い合わせ先URL">
              <input type="url" value={project.inquiryUrl} onChange={(e) => updateField('inquiryUrl', e.target.value)} className={inputClass} />
            </Field>
          </Card>
        )}

        {section === '証拠画像' && (
          <Card>
            <EvidenceImages projectId={projectId} images={images} onImagesChange={handleImagesChange} />
          </Card>
        )}

        {section === '個人情報の確認' && (
          <Card className="space-y-3">
            <p className="text-xs text-[var(--color-ink-soft)]">
              実際の個人情報は保存しません。使用した／していないのチェックのみ記録します。
            </p>
            {(
              [
                ['name', '氏名'],
                ['email', 'メールアドレス'],
                ['phone', '電話番号'],
                ['address', '住所'],
                ['idDocument', '本人確認書類'],
                ['bankAccount', '銀行口座'],
              ] as const
            ).map(([key, label]) => (
              <label key={key} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={project.personalInfoUsage[key]}
                  onChange={(e) => updatePersonalInfo(key, e.target.checked)}
                  className="h-4 w-4 accent-[var(--color-green-dark)]"
                />
                {label} を使用した
              </label>
            ))}
          </Card>
        )}

        <button
          onClick={() => setConfirmDeleteOpen(true)}
          className="w-full rounded-xl border border-[var(--color-warn-text)] py-2.5 text-sm font-bold text-[var(--color-warn-text)]"
        >
          この案件をゴミ箱に移動する
        </button>
      </div>

      <ConfirmDialog
        open={confirmDeleteOpen}
        title="この案件をゴミ箱に移動しますか？"
        description="30日以内であれば、設定画面のゴミ箱から元に戻せます。"
        confirmLabel="ゴミ箱に移動する"
        onConfirm={handleConfirmDelete}
        onCancel={() => setConfirmDeleteOpen(false)}
      />
    </AppShell>
  )
}

function parseNullableNumber(raw: string): number | null {
  if (raw === '') return null
  const n = Number(raw)
  return Number.isNaN(n) ? null : n
}

function parseNumber(raw: string): number {
  const n = Number(raw)
  return Number.isNaN(n) ? 0 : n
}

const inputClass =
  'w-full rounded-xl border border-[var(--color-line)] bg-[var(--color-surface)] px-3 py-2.5 text-sm outline-none focus:border-[var(--color-green-dark)]'

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-bold text-[var(--color-ink-soft)]">{label}</span>
      {children}
    </label>
  )
}
