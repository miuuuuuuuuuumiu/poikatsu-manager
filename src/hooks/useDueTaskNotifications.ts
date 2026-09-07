import { useEffect } from 'react'
import type { TaskItem } from '../types'
import { classifyDueDate, todayISO } from '../lib/dateUtils'
import { getNotificationPermission, showNotification } from '../lib/notifications'

const LAST_NOTIFIED_KEY = 'poikatsu:lastNotifiedDate'

/**
 * アプリを開いたときに、期限が今日・期限超過の未完了タスクがあれば1日1回だけ通知する。
 * 通知が許可されていない・利用できない端末では何もしない（警告表示は別途ホーム・予定画面に出る）。
 */
export function useDueTaskNotifications(tasks: TaskItem[]) {
  useEffect(() => {
    if (getNotificationPermission() !== 'granted') return

    const today = todayISO()
    let lastNotified: string | null = null
    try {
      lastNotified = localStorage.getItem(LAST_NOTIFIED_KEY)
    } catch {
      // プライベートブラウジングなどでlocalStorageが使えない場合は毎回通知される可能性があるが、
      // 通知自体は問題なく動作する
    }
    if (lastNotified === today) return

    const dueCount = tasks.filter((t) => {
      if (t.isDone) return false
      const bucket = classifyDueDate(t.dueDate, today)
      return bucket === '今日' || bucket === '期限超過'
    }).length

    if (dueCount > 0) {
      showNotification('ポイ活マネージャー', `期限が今日、または過ぎている作業が${dueCount}件あります`)
    }

    try {
      localStorage.setItem(LAST_NOTIFIED_KEY, today)
    } catch {
      // 保存できなくても致命的ではないため無視する
    }
  }, [tasks])
}
