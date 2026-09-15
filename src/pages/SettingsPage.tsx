import { useEffect, useState, type ChangeEvent } from 'react'
import { Link } from 'react-router-dom'
import { AppShell } from '../components/layout/AppShell'
import { Card } from '../components/common/Card'
import { ConfirmDialog } from '../components/common/ConfirmDialog'
import { WarningBanner } from '../components/common/WarningBanner'
import { listActiveProjects, importProjectsFromCsv } from '../lib/repositories/projects'
import { listPointSites } from '../lib/repositories/pointSites'
import { getSettings, saveSettings } from '../lib/repositories/settings'
import { projectsToCsv, parseProjectsCsv } from '../lib/csv'
import { buildBackup, isValidBackup, restoreBackup, type BackupData } from '../lib/backup'
import { clearAllData } from '../lib/repositories/maintenance'
import { deleteSampleProjects, insertSampleProjects } from '../lib/sampleData'
import { downloadFile, timestampForFilename } from '../lib/downloadFile'
import { syncNow, testConnection } from '../lib/cloudSync'
import type { AppSettings } from '../types'

type Message = { type: 'success' | 'error'; text: string }

export function SettingsPage() {
  const [message, setMessage] = useState<Message | null>(null)
  const [busy, setBusy] = useState(false)
  const [deleteStep1Open, setDeleteStep1Open] = useState(false)
  const [deleteStep2Open, setDeleteStep2Open] = useState(false)
  const [settings, setSettings] = useState<AppSettings | null>(null)
  const [newUserName, setNewUserName] = useState('')
  const [syncBusy, setSyncBusy] = useState(false)
  const [syncMessage, setSyncMessage] = useState<Message | null>(null)

  useEffect(() => {
    void getSettings().then(setSettings)
  }, [])

  async function handleGoalChange(value: string) {
    const amount = value === '' ? 0 : Number(value)
    if (Number.isNaN(amount)) return
    const next: AppSettings = { ...(settings ?? (await getSettings())), monthlyGoalAmount: amount }
    setSettings(next)
    await saveSettings(next)
  }

  async function handleAddUserName() {
    const name = newUserName.trim()
    if (!name || !settings) return
    if (settings.userNames.includes(name)) {
      setNewUserName('')
      return
    }
    const next: AppSettings = { ...settings, userNames: [...settings.userNames, name] }
    setSettings(next)
    setNewUserName('')
    await saveSettings(next)
  }

  async function handleRemoveUserName(name: string) {
    if (!settings) return
    const next: AppSettings = { ...settings, userNames: settings.userNames.filter((n) => n !== name) }
    setSettings(next)
    await saveSettings(next)
  }

  async function updateSyncField<K extends keyof AppSettings['sync']>(key: K, value: AppSettings['sync'][K]) {
    const current = settings ?? (await getSettings())
    const next: AppSettings = { ...current, sync: { ...current.sync, [key]: value } }
    setSettings(next)
    await saveSettings(next)
  }

  async function handleTestConnection() {
    if (!settings) return
    setSyncBusy(true)
    setSyncMessage(null)
    try {
      const result = await testConnection(settings.sync.webAppUrl, settings.sync.token)
      setSyncMessage({ type: result.ok ? 'success' : 'error', text: result.message })
    } finally {
      setSyncBusy(false)
    }
  }

  async function handleSyncNow() {
    setSyncBusy(true)
    setSyncMessage(null)
    try {
      const result = await syncNow()
      setSyncMessage({ type: result.ok ? 'success' : 'error', text: result.message })
      setSettings(await getSettings())
    } finally {
      setSyncBusy(false)
    }
  }

  async function handleExportCsv() {
    setBusy(true)
    try {
      const [projects, sites] = await Promise.all([listActiveProjects(), listPointSites()])
      const csv = projectsToCsv(projects, sites)
      downloadFile(`poikatsu_案件一覧_${timestampForFilename()}.csv`, new Blob([csv], { type: 'text/csv;charset=utf-8' }))
      setMessage({ type: 'success', text: `CSVを書き出しました（${projects.length}件）` })
    } catch {
      setMessage({ type: 'error', text: 'CSVの書き出しに失敗しました' })
    } finally {
      setBusy(false)
    }
  }

  async function handleImportCsv(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setBusy(true)
    try {
      const text = await file.text()
      const sites = await listPointSites()
      const rows = parseProjectsCsv(text, sites)
      if (rows.length === 0) {
        setMessage({ type: 'error', text: 'CSVから案件を読み取れませんでした。見出し行や案件IDの列を確認してください。' })
        return
      }
      const { created, updated } = await importProjectsFromCsv(rows)
      setMessage({ type: 'success', text: `CSVを読み込みました（新規${created}件・更新${updated}件）` })
    } catch {
      setMessage({ type: 'error', text: 'CSVの読み込みに失敗しました。ファイルの形式をご確認ください。' })
    } finally {
      setBusy(false)
    }
  }

  async function handleExportBackup() {
    setBusy(true)
    try {
      const data = await buildBackup()
      downloadFile(
        `poikatsu_バックアップ_${timestampForFilename()}.json`,
        new Blob([JSON.stringify(data)], { type: 'application/json' }),
      )
      setMessage({ type: 'success', text: `バックアップを書き出しました（案件${data.projects.length}件・画像${data.images.length}件）` })
    } catch {
      setMessage({ type: 'error', text: 'バックアップの書き出しに失敗しました' })
    } finally {
      setBusy(false)
    }
  }

  async function handleImportBackup(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setBusy(true)
    try {
      const text = await file.text()
      const data: unknown = JSON.parse(text)
      if (!isValidBackup(data)) {
        setMessage({ type: 'error', text: 'このファイルはバックアップの形式ではないようです' })
        return
      }
      await restoreBackup(data as BackupData)
      setMessage({ type: 'success', text: '復元しました。画面を最新の状態に更新します…' })
      setTimeout(() => window.location.reload(), 800)
    } catch {
      setMessage({ type: 'error', text: 'バックアップの読み込みに失敗しました。ファイルの形式をご確認ください。' })
    } finally {
      setBusy(false)
    }
  }

  async function handleShowSampleData() {
    setBusy(true)
    try {
      const count = await insertSampleProjects()
      setMessage({ type: 'success', text: `サンプル案件を${count}件追加しました（案件一覧からご確認ください）` })
    } finally {
      setBusy(false)
    }
  }

  async function handleDeleteSampleData() {
    setBusy(true)
    try {
      const count = await deleteSampleProjects()
      setMessage({ type: 'success', text: `サンプル案件を${count}件削除しました` })
    } finally {
      setBusy(false)
    }
  }

  async function handleFullDeleteConfirmed() {
    setDeleteStep2Open(false)
    setBusy(true)
    try {
      await clearAllData()
      window.location.href = '/'
    } catch {
      setMessage({ type: 'error', text: '削除に失敗しました' })
      setBusy(false)
    }
  }

  return (
    <AppShell title="設定・バックアップ">
      <div className="space-y-5">
        {message && (
          <WarningBanner level={message.type === 'success' ? 'success' : 'danger'} title={message.text} />
        )}

        <section>
          <h2 className="mb-2 text-sm font-bold text-[var(--color-ink-soft)]">目標・基本設定</h2>
          <Card className="space-y-4">
            <label className="block">
              <span className="mb-1 block text-xs font-bold text-[var(--color-ink-soft)]">月間目標金額</span>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  inputMode="numeric"
                  value={settings?.monthlyGoalAmount ?? ''}
                  onChange={(e) => void handleGoalChange(e.target.value)}
                  className="w-full rounded-xl border border-[var(--color-line)] bg-[var(--color-surface)] px-3 py-2.5 text-sm outline-none focus:border-[var(--color-green-dark)]"
                />
                <span className="shrink-0 text-sm text-[var(--color-ink-soft)]">円</span>
              </div>
            </label>

            <div>
              <span className="mb-1 block text-xs font-bold text-[var(--color-ink-soft)]">利用者名</span>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newUserName}
                  onChange={(e) => setNewUserName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      void handleAddUserName()
                    }
                  }}
                  placeholder="例：本人、配偶者 など"
                  className="w-full rounded-xl border border-[var(--color-line)] bg-[var(--color-surface)] px-3 py-2.5 text-sm outline-none focus:border-[var(--color-green-dark)]"
                />
                <button
                  onClick={handleAddUserName}
                  className="shrink-0 rounded-xl bg-[var(--color-green-dark)] px-4 py-2.5 text-sm font-bold text-white"
                >
                  追加
                </button>
              </div>
              {settings && settings.userNames.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {settings.userNames.map((name) => (
                    <span
                      key={name}
                      className="flex items-center gap-1 rounded-full bg-[var(--color-beige)] px-3 py-1 text-xs font-bold"
                    >
                      {name}
                      <button onClick={() => handleRemoveUserName(name)} className="text-[var(--color-warn-text)]">
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </Card>
        </section>

        <section>
          <h2 className="mb-2 text-sm font-bold text-[var(--color-ink-soft)]">クラウド同期（PC⇔スマホ）</h2>
          <Card className="space-y-4">
            <p className="text-xs text-[var(--color-ink-soft)]">
              無料のGoogleアカウントを使って、パソコンとスマホなど複数の端末でデータを自動的に合わせられます。設定しなくてもアプリは通常通り使えます。手順は
              <a
                href="https://github.com/miuuuuuuuuuumiu/poikatsu-manager#5-pcとスマホの自動同期（任意）"
                target="_blank"
                rel="noreferrer"
                className="mx-1 underline"
              >
                README
              </a>
              をご覧ください。
            </p>

            <label className="block">
              <span className="mb-1 block text-xs font-bold text-[var(--color-ink-soft)]">Web AppのURL</span>
              <input
                type="url"
                placeholder="https://script.google.com/macros/s/.../exec"
                value={settings?.sync.webAppUrl ?? ''}
                onChange={(e) => void updateSyncField('webAppUrl', e.target.value)}
                className="w-full rounded-xl border border-[var(--color-line)] bg-[var(--color-surface)] px-3 py-2.5 text-sm outline-none focus:border-[var(--color-green-dark)]"
              />
            </label>

            <label className="block">
              <span className="mb-1 block text-xs font-bold text-[var(--color-ink-soft)]">合言葉（トークン）</span>
              <input
                type="text"
                value={settings?.sync.token ?? ''}
                onChange={(e) => void updateSyncField('token', e.target.value)}
                className="w-full rounded-xl border border-[var(--color-line)] bg-[var(--color-surface)] px-3 py-2.5 text-sm outline-none focus:border-[var(--color-green-dark)]"
              />
            </label>

            <label className="flex items-center gap-2 text-sm font-bold">
              <input
                type="checkbox"
                checked={settings?.sync.enabled ?? false}
                onChange={(e) => void updateSyncField('enabled', e.target.checked)}
                className="h-4 w-4 accent-[var(--color-green-dark)]"
              />
              自動同期を有効にする
            </label>

            {syncMessage && (
              <p
                className={`text-xs font-bold ${
                  syncMessage.type === 'success' ? 'text-[var(--color-green-text)]' : 'text-[var(--color-warn-text)]'
                }`}
              >
                {syncMessage.text}
              </p>
            )}

            <p className="text-xs text-[var(--color-ink-soft)]">
              {settings?.sync.lastSyncedAt
                ? `最終同期：${new Date(settings.sync.lastSyncedAt).toLocaleString('ja-JP')}`
                : 'まだ同期していません'}
            </p>

            <div className="flex gap-2">
              <button
                disabled={syncBusy || !settings?.sync.webAppUrl || !settings.sync.token}
                onClick={handleTestConnection}
                className="flex-1 rounded-xl border border-[var(--color-line)] py-2.5 text-sm font-bold disabled:opacity-50"
              >
                接続テスト
              </button>
              <button
                disabled={syncBusy || !settings?.sync.enabled}
                onClick={handleSyncNow}
                className="flex-1 rounded-xl bg-[var(--color-green-dark)] py-2.5 text-sm font-bold text-white disabled:opacity-50"
              >
                今すぐ同期
              </button>
            </div>
          </Card>
        </section>

        <section>
          <h2 className="mb-2 text-sm font-bold text-[var(--color-ink-soft)]">ポイントサイト</h2>
          <Card className="p-0">
            <Link to="/settings/point-sites" className="block w-full px-4 py-3 text-left text-sm font-bold text-[var(--color-ink)]">
              ポイントサイトの管理（追加・編集・削除・交換率）
            </Link>
          </Card>
        </section>

        <section>
          <h2 className="mb-2 text-sm font-bold text-[var(--color-ink-soft)]">データ管理</h2>
          <Card className="divide-y divide-[var(--color-line)] p-0">
            <button disabled={busy} onClick={handleExportCsv} className={rowClass}>
              CSV出力
            </button>
            <label className={`${rowClass} cursor-pointer`}>
              CSV読込
              <input type="file" accept=".csv,text/csv" className="hidden" disabled={busy} onChange={handleImportCsv} />
            </label>
            <button disabled={busy} onClick={handleExportBackup} className={rowClass}>
              JSON完全バックアップ
            </button>
            <label className={`${rowClass} cursor-pointer`}>
              バックアップから復元
              <input type="file" accept=".json,application/json" className="hidden" disabled={busy} onChange={handleImportBackup} />
            </label>
            <Link to="/settings/trash" className={rowClass}>
              ゴミ箱を見る
            </Link>
          </Card>
        </section>

        <section>
          <h2 className="mb-2 text-sm font-bold text-[var(--color-ink-soft)]">お試し・その他</h2>
          <Card className="divide-y divide-[var(--color-line)] p-0">
            <button disabled={busy} onClick={handleShowSampleData} className={rowClass}>
              サンプルデータを表示
            </button>
            <button disabled={busy} onClick={handleDeleteSampleData} className={rowClass}>
              サンプルデータを削除
            </button>
            <button disabled={busy} onClick={() => setDeleteStep1Open(true)} className={`${rowClass} text-[var(--color-warn-text)]`}>
              全データ削除
            </button>
          </Card>
        </section>
      </div>

      <ConfirmDialog
        open={deleteStep1Open}
        title="すべてのデータを削除しますか？"
        description="案件・作業・画像・ポイントサイトの設定など、このアプリのすべてのデータが消えます。この操作は取り消せません。"
        confirmLabel="次へ進む"
        onConfirm={() => {
          setDeleteStep1Open(false)
          setDeleteStep2Open(true)
        }}
        onCancel={() => setDeleteStep1Open(false)}
      />
      <ConfirmDialog
        open={deleteStep2Open}
        title="本当によろしいですか？（最終確認）"
        description="もう一度確認します。この操作を行うと、バックアップを取っていない限りデータは二度と戻せません。"
        confirmLabel="削除する"
        onConfirm={handleFullDeleteConfirmed}
        onCancel={() => setDeleteStep2Open(false)}
      />
    </AppShell>
  )
}

const rowClass = 'block w-full px-4 py-3 text-left text-sm font-bold text-[var(--color-ink)] disabled:opacity-50'
