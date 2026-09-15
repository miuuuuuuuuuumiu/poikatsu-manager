import { getDB, SETTINGS_KEY } from '../db'
import { DEFAULT_CATEGORIES } from '../constants'
import { createDefaultSyncConfig, type AppSettings } from '../../types'

export function defaultSettings(): AppSettings {
  return {
    monthlyGoalAmount: 30000,
    userNames: [],
    categories: [...DEFAULT_CATEGORIES],
    updatedAt: new Date(0).toISOString(),
    sync: createDefaultSyncConfig(),
  }
}

export async function getSettings(): Promise<AppSettings> {
  const db = await getDB()
  const stored = await db.get('settings', SETTINGS_KEY)
  if (!stored) return defaultSettings()
  // 同期機能を追加する前に保存された設定には sync / updatedAt が無いため、不足分を補う
  return { ...defaultSettings(), ...stored, sync: { ...createDefaultSyncConfig(), ...stored.sync } }
}

export async function saveSettings(settings: AppSettings): Promise<void> {
  const db = await getDB()
  await db.put('settings', { ...settings, updatedAt: new Date().toISOString() }, SETTINGS_KEY)
}
