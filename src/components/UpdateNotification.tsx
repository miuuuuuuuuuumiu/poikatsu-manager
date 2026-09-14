import { useEffect, useState } from 'react'
import { registerSW } from 'virtual:pwa-register'

/**
 * アプリの新しいバージョンが公開されたとき、「更新があります」と画面に表示する。
 * これが無いと、ブラウザを更新(リロード)しただけでは古い内容のまま表示され続けることがある
 * （PWAのオフライン用キャッシュの仕組み上、裏側で準備は整っても自動では切り替わらないため）。
 */
export function UpdateNotification() {
  const [needRefresh, setNeedRefresh] = useState(false)
  const [updateSW, setUpdateSW] = useState<((reloadPage?: boolean) => Promise<void>) | null>(null)

  useEffect(() => {
    const update = registerSW({
      onNeedRefresh() {
        setNeedRefresh(true)
      },
      onRegisteredSW(_url, registration) {
        // 数分おきに新しいバージョンが無いか確認する
        if (!registration) return
        setInterval(() => void registration.update(), 5 * 60 * 1000)
      },
    })
    setUpdateSW(() => update)
  }, [])

  if (!needRefresh || !updateSW) return null

  return (
    <div className="fixed inset-x-0 top-0 z-40 flex items-center justify-between gap-3 bg-[var(--color-green-dark)] px-4 py-2 text-sm text-white">
      <p className="font-bold">新しいバージョンがあります</p>
      <button
        onClick={() => void updateSW(true)}
        className="shrink-0 rounded-lg bg-white px-3 py-1 text-xs font-bold text-[var(--color-green-dark)]"
      >
        更新する
      </button>
    </div>
  )
}
