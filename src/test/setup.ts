import 'fake-indexeddb/auto'
import '@testing-library/jest-dom/vitest'
import { vi } from 'vitest'

// virtual:pwa-register はVite/PWAプラグインが実際のビルド時にだけ提供する仮想モジュールで、
// テスト環境（vitest/jsdom）では解決できないため、テスト用にダミーへ差し替える。
vi.mock('virtual:pwa-register', () => ({
  registerSW: () => () => Promise.resolve(),
}))
