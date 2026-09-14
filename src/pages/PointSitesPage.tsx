import { useEffect, useState, type ReactNode } from 'react'
import { AppShell } from '../components/layout/AppShell'
import { Card } from '../components/common/Card'
import { AutoResizeTextarea } from '../components/common/AutoResizeTextarea'
import { ConfirmDialog } from '../components/common/ConfirmDialog'
import {
  createBlankPointSite,
  deletePointSite,
  listPointSites,
  savePointSite,
} from '../lib/repositories/pointSites'
import { generateId } from '../lib/generateId'
import type { PointSite } from '../types'

export function PointSitesPage() {
  const [sites, setSites] = useState<PointSite[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<PointSite | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<PointSite | null>(null)

  async function reload() {
    setSites(await listPointSites())
    setLoading(false)
  }

  useEffect(() => {
    void reload()
  }, [])

  async function handleSave() {
    if (!editing) return
    await savePointSite(editing)
    setEditing(null)
    await reload()
  }

  async function handleDeleteConfirmed() {
    if (!deleteTarget) return
    await deletePointSite(deleteTarget.id)
    setDeleteTarget(null)
    if (editing?.id === deleteTarget.id) setEditing(null)
    await reload()
  }

  return (
    <AppShell title="ポイントサイト管理">
      <div className="space-y-4">
        <p className="rounded-xl bg-[var(--color-green)] p-3 text-sm text-[var(--color-green-text)]">
          交換率の例：1ポイント＝1円なら「1」、10ポイント＝1円なら「10」、2ポイント＝1円なら「2」を入力します。
          正確な交換率が分からない場合は、未設定のままにしてください。
        </p>

        <button
          onClick={() => setEditing(createBlankPointSite(generateId()))}
          className="w-full rounded-xl bg-[var(--color-green-dark)] py-2.5 text-sm font-bold text-white"
        >
          ＋ ポイントサイトを追加
        </button>

        {editing && (
          <SiteEditor
            site={editing}
            onChange={setEditing}
            onSave={handleSave}
            onCancel={() => setEditing(null)}
            onDelete={() => setDeleteTarget(editing)}
          />
        )}

        {loading ? (
          <p className="text-sm text-[var(--color-ink-soft)]">読み込み中…</p>
        ) : (
          <div className="space-y-2">
            {sites.map((site) => (
              <button key={site.id} onClick={() => setEditing(site)} className="block w-full text-left">
                <Card className={site.isActive ? '' : 'opacity-50'}>
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-bold">{site.name}</p>
                    {!site.isActive && (
                      <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-bold text-gray-500">無効</span>
                    )}
                  </div>
                  <p className="mt-0.5 text-sm text-[var(--color-ink-soft)]">
                    {site.pointsPerYen != null ? `${site.pointsPerYen}ポイント＝1円` : '交換率：未設定'}
                  </p>
                </Card>
              </button>
            ))}
          </div>
        )}
      </div>

      <ConfirmDialog
        open={!!deleteTarget}
        title={`「${deleteTarget?.name}」を削除しますか？`}
        description="このサイトを使っている案件は「サイト未設定」として表示されますが、案件データ自体は消えません。"
        confirmLabel="削除する"
        onConfirm={handleDeleteConfirmed}
        onCancel={() => setDeleteTarget(null)}
      />
    </AppShell>
  )
}

function SiteEditor({
  site,
  onChange,
  onSave,
  onCancel,
  onDelete,
}: {
  site: PointSite
  onChange: (site: PointSite) => void
  onSave: () => void
  onCancel: () => void
  onDelete: () => void
}) {
  return (
    <Card className="space-y-3 border-2 border-[var(--color-green-dark)]">
      <Field label="サイト名">
        <input
          type="text"
          value={site.name}
          onChange={(e) => onChange({ ...site, name: e.target.value })}
          className={inputClass}
        />
      </Field>
      <Field label="1円に必要なポイント数">
        <input
          type="number"
          inputMode="numeric"
          placeholder="未設定のままでもOK"
          value={site.pointsPerYen ?? ''}
          onChange={(e) => {
            const raw = e.target.value
            onChange({ ...site, pointsPerYen: raw === '' ? null : Number(raw) })
          }}
          className={inputClass}
        />
        <p className="mt-1 text-xs text-[var(--color-ink-soft)]">
          {site.pointsPerYen != null && site.pointsPerYen > 0
            ? `${site.pointsPerYen}ポイント＝1円 という設定になります`
            : '例：10ポイント＝1円なら「10」と入力します'}
        </p>
      </Field>
      <Field label="問い合わせ先URL">
        <input
          type="url"
          placeholder="https://"
          value={site.inquiryUrl}
          onChange={(e) => onChange({ ...site, inquiryUrl: e.target.value })}
          className={inputClass}
        />
      </Field>
      <Field label="メモ">
        <AutoResizeTextarea rows={2} value={site.memo} onChange={(e) => onChange({ ...site, memo: e.target.value })} className={inputClass} />
      </Field>
      <label className="flex items-center gap-2 text-sm font-bold">
        <input
          type="checkbox"
          checked={site.isActive}
          onChange={(e) => onChange({ ...site, isActive: e.target.checked })}
          className="h-4 w-4 accent-[var(--color-green-dark)]"
        />
        有効にする
      </label>

      <div className="flex gap-2 pt-1">
        <button onClick={onCancel} className="flex-1 rounded-xl border border-[var(--color-line)] py-2.5 text-sm font-bold">
          キャンセル
        </button>
        <button onClick={onSave} className="flex-1 rounded-xl bg-[var(--color-green-dark)] py-2.5 text-sm font-bold text-white">
          保存する
        </button>
      </div>
      <button onClick={onDelete} className="w-full text-center text-xs font-bold text-[var(--color-warn-text)]">
        このサイトを削除する
      </button>
    </Card>
  )
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
