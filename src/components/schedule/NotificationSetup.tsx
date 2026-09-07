import { useState } from 'react'
import { getNotificationPermission, isNotificationSupported, requestNotificationPermission } from '../../lib/notifications'
import { WarningBanner } from '../common/WarningBanner'

export function NotificationSetup() {
  const [permission, setPermission] = useState(getNotificationPermission())

  if (!isNotificationSupported()) {
    return (
      <WarningBanner
        level="caution"
        title="この端末・ブラウザでは通知を利用できません"
        description="通知の代わりに、ホーム画面とこの予定画面の警告表示で必ず確認できます。"
      />
    )
  }

  if (permission === 'granted') {
    return (
      <WarningBanner
        level="success"
        title="通知は有効です"
        description="アプリを開いたときに、期限が近い作業があればお知らせします（アプリを閉じている間の通知には対応していません）。"
      />
    )
  }

  if (permission === 'denied') {
    return (
      <WarningBanner
        level="caution"
        title="通知がブロックされています"
        description="ブラウザの設定から通知を許可すると使えるようになります。それまではホーム画面と予定画面の警告表示をご確認ください。"
      />
    )
  }

  return (
    <div className="flex items-center justify-between gap-3 rounded-xl bg-[var(--color-beige)] p-3">
      <div className="min-w-0">
        <p className="text-sm font-bold">通知を有効にしますか？</p>
        <p className="text-xs text-[var(--color-ink-soft)]">期限が近い作業をアプリを開いたときにお知らせします</p>
      </div>
      <button
        onClick={async () => setPermission(await requestNotificationPermission())}
        className="shrink-0 rounded-lg bg-[var(--color-green-dark)] px-3 py-2 text-xs font-bold text-white"
      >
        有効にする
      </button>
    </div>
  )
}
