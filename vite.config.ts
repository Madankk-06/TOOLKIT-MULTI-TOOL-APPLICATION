import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      workbox: {
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
        globPatterns: ['**/*.{js,css,html,ico,png,svg,webp,wasm}'],
        skipWaiting: true,
        clientsClaim: true,
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/api\.openweathermap\.org/,
            handler: 'StaleWhileRevalidate',
            options: { cacheName: 'weather-api', expiration: { maxEntries: 50, maxAgeSeconds: 86400 } }
          }
        ]
      },
      manifest: {
        name: 'ToolKit',
        short_name: 'ToolKit',
        description: 'All-in-one utility swiss-army PWA',
        theme_color: '#ff00aa',
        background_color: '#000000',
        display: 'standalone',
        orientation: 'portrait-primary',
        icons: [
          { src: '/icons/192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' }
        ]
      }
    })
  ],
  server: { port: 5173, open: true },

  // ── Vitest configuration ──────────────────────────────────────────────────
  test: {
    globals:     true,
    environment: 'jsdom',
    setupFiles:  ['./src/__tests__/setup.ts'],
    include:     ['src/**/*.{test,spec}.{ts,tsx}'],
    coverage: {
      provider:  'v8',
      include:   ['src/lib/**'],
      reporter:  ['text', 'html']
    }
  }
})