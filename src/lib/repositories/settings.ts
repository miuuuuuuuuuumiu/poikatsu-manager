import { getDB, SETTINGS_KEY } from '../db'
import { DEFAULT_CATEGORIES } from '../constants'
import type { AppSettings } from '../../types'

export function defaultSettings(): AppSettings {
  return {
    monthlyGoalAmount: 30000,
    userNames: [],
    categories: [...DEFAULT_CATEGORIES],
  }
}

export async function getSettings(): Promise<AppSettings> {
  const db = await getDB()
  const settings = await db.get('settings', SETTINGS_KEY)
  return settings ?? defaultSettings()
}

export async function saveSettings(settings: AppSettings): Promise<void> {
  const db = await getDB()
  await db.put('settings', settings, SETTINGS_KEY)
}
