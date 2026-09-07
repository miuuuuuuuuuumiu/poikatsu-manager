// 通知機能はブラウザ標準のNotification APIのみを使う（追加費用・専用サーバー不要）。
// このアプリはバックエンドサーバーを持たないため、アプリを開いている間に
// 期限が近い作業をお知らせする「その場での通知」のみに対応する。
// アプリを閉じている間の通知（プッシュ通知）には対応していない。
// 対応していない端末・ブラウザでは「通知できる」と偽らず、はっきりと伝える。

export function isNotificationSupported(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window
}

export function getNotificationPermission(): NotificationPermission | 'unsupported' {
  if (!isNotificationSupported()) return 'unsupported'
  return Notification.permission
}

export async function requestNotificationPermission(): Promise<NotificationPermission | 'unsupported'> {
  if (!isNotificationSupported()) return 'unsupported'
  try {
    return await Notification.requestPermission()
  } catch {
    return Notification.permission
  }
}

export function showNotification(title: string, body: string): void {
  if (!isNotificationSupported() || Notification.permission !== 'granted') return
  try {
    new Notification(title, { body, icon: '/favicon.svg' })
  } catch {
    // 一部のモバイルブラウザでは new Notification() 自体が使えないことがあるため、
    // 失敗しても画面上の警告表示は別途出ているのでアプリは問題なく使い続けられる。
  }
}
