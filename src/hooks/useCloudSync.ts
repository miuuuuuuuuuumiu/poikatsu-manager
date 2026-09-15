import { useEffect } from 'react'
import { scheduleSync, syncNow } from '../lib/cloudSync'
import { onDataChanged } from '../lib/syncTrigger'

const POLL_INTERVAL_MS = 10_000

/**
 * クラウド同期を自動で走らせておくためのフック。App.tsxに1つだけ置く。
 * ・データが変更されたら2秒後に同期
 * ・10秒おきに同期（相手側の変更を拾うため）
 * ・アプリがバックグラウンドから戻ってきた瞬間にも同期
 * 同期が未設定・無効なときは、syncNow()側が何もせず終わるだけなので安全。
 */
export function useCloudSync(): void {
  useEffect(() => {
    void syncNow()

    const unsubscribe = onDataChanged(() => scheduleSync())

    const intervalId = window.setInterval(() => {
      void syncNow()
    }, POLL_INTERVAL_MS)

    function handleVisibilityChange() {
      if (document.visibilityState === 'visible') {
        void syncNow()
      }
    }
    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      unsubscribe()
      window.clearInterval(intervalId)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [])
}
