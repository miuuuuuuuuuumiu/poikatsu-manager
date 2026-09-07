import { useEffect, useState } from 'react'
import { AppShell } from '../components/layout/AppShell'
import { Card } from '../components/common/Card'
import { ConfirmDialog } from '../components/common/ConfirmDialog'
import { listTrashedProjects, purgeProject, restoreProjectFromTrash } from '../lib/repositories/projects'
import type { Project } from '../types'

const TRASH_RETENTION_DAYS = 30

function daysSince(isoDateTime: string): number {
  const deleted = new Date(isoDateTime)
  const now = new Date()
  return Math.floor((now.getTime() - deleted.getTime()) / (1000 * 60 * 60 * 24))
}

export function TrashPage() {
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [purgeTarget, setPurgeTarget] = useState<Project | null>(null)
  const [emptyTrashOpen, setEmptyTrashOpen] = useState(false)

  async function reload() {
    setProjects(await listTrashedProjects())
    setLoading(false)
  }

  useEffect(() => {
    void reload()
  }, [])

  async function handleRestore(id: string) {
    await restoreProjectFromTrash(id)
    await reload()
  }

  async function handlePurgeConfirmed() {
    if (!purgeTarget) return
    await purgeProject(purgeTarget.id)
    setPurgeTarget(null)
    await reload()
  }

  async function handleEmptyTrashConfirmed() {
    setEmptyTrashOpen(false)
    for (const p of projects) await purgeProject(p.id)
    await reload()
  }

  return (
    <AppShell title="ゴミ箱">
      <div className="space-y-4">
        <p className="rounded-xl bg-[var(--color-green)] p-3 text-sm text-[var(--color-green-text)]">
          削除した案件は30日間ここに残ります。30日を過ぎると完全に削除できるようになります。
        </p>

        {projects.length > 0 && (
          <button
            onClick={() => setEmptyTrashOpen(true)}
            className="w-full rounded-xl border border-[var(--color-warn-text)] py-2.5 text-sm font-bold text-[var(--color-warn-text)]"
          >
            ゴミ箱を空にする（{projects.length}件すべて完全に削除）
          </button>
        )}

        {loading ? (
          <p className="text-sm text-[var(--color-ink-soft)]">読み込み中…</p>
        ) : projects.length === 0 ? (
          <p className="rounded-xl border border-dashed border-[var(--color-line)] p-6 text-center text-sm text-[var(--color-ink-soft)]">
            ゴミ箱は空です
          </p>
        ) : (
          <div className="space-y-2">
            {projects.map((p) => {
              const elapsed = daysSince(p.deletedAt ?? p.updatedAt)
              const canPurge = elapsed >= TRASH_RETENTION_DAYS
              return (
                <Card key={p.id}>
                  <p className="font-bold">{p.name || '（名称未設定）'}</p>
                  <p className="mt-0.5 text-xs text-[var(--color-ink-soft)]">
                    {canPurge
                      ? '削除から30日以上経過しています（完全削除できます）'
                      : `削除から${elapsed}日経過（あと${TRASH_RETENTION_DAYS - elapsed}日で完全削除が可能になります）`}
                  </p>
                  <div className="mt-2 flex gap-2">
                    <button
                      onClick={() => handleRestore(p.id)}
                      className="flex-1 rounded-lg bg-[var(--color-green-dark)] py-2 text-sm font-bold text-white"
                    >
                      復元する
                    </button>
                    <button
                      onClick={() => setPurgeTarget(p)}
                      disabled={!canPurge}
                      className="flex-1 rounded-lg border border-[var(--color-warn-text)] py-2 text-sm font-bold text-[var(--color-warn-text)] disabled:cursor-not-allowed disabled:border-[var(--color-line)] disabled:text-[var(--color-ink-soft)]"
                    >
                      完全に削除する
                    </button>
                  </div>
                </Card>
              )
            })}
          </div>
        )}
      </div>

      <ConfirmDialog
        open={!!purgeTarget}
        title={`「${purgeTarget?.name || '（名称未設定）'}」を完全に削除しますか？`}
        description="この操作は取り消せません。画像などの関連データも削除されます。"
        confirmLabel="完全に削除する"
        onConfirm={handlePurgeConfirmed}
        onCancel={() => setPurgeTarget(null)}
      />
      <ConfirmDialog
        open={emptyTrashOpen}
        title="ゴミ箱を空にしますか？"
        description={`ゴミ箱の中の${projects.length}件をすべて完全に削除します。この操作は取り消せません。`}
        confirmLabel="空にする"
        onConfirm={handleEmptyTrashConfirmed}
        onCancel={() => setEmptyTrashOpen(false)}
      />
    </AppShell>
  )
}
