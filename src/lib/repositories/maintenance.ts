import { getDB } from '../db'

/** すべてのデータを削除する（元に戻せない）。ポイントサイトの初期データは次回起動時に自動で再登録される */
export async function clearAllData(): Promise<void> {
  const db = await getDB()
  await Promise.all([
    db.clear('projects'),
    db.clear('projectImages'),
    db.clear('tasks'),
    db.clear('pointSites'),
    db.clear('settings'),
  ])
}
