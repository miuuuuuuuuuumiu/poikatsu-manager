import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  // GitHub Pagesではリポジトリ名のサブパス（例: /poikatsu-manager/）で公開されるため指定する。
  // GITHUB_PAGES_BASE環境変数が無い場合はローカル開発用に "/" のままにする。
  base: process.env.GITHUB_PAGES_BASE || '/',
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
      manifest: {
        name: 'ポイ活マネージャー',
        short_name: 'ポイ活',
        description: 'ポイ活の案件・作業・利益をスマホで管理できるアプリです。',
        lang: 'ja',
        start_url: '.',
        display: 'standalone',
        background_color: '#fefdfb',
        theme_color: '#f6f3ec',
        icons: [
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          { src: 'pwa-maskable-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // 案件データはIndexedDBに保存されるためオフラインでも動くが、
        // アプリ本体（HTML/JS/CSS）もキャッシュしてオフラインで開けるようにする
        globPatterns: ['**/*.{js,css,html,svg,png,ico}'],
      },
    }),
  ],
  // 同じWi-Fiにつないだスマホからアクセスできるよう、パソコンのIPアドレスでも待ち受ける
  server: { host: true },
  preview: { host: true },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
  },
})
