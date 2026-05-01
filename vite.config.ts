import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'
import path from 'node:path'

const ICON_VERSION = '20260501v2'

// https://vite.dev/config/
export default defineConfig({
  base: '/',
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      includeAssets: ['favicon.png', 'apple-touch-icon.png'],
      manifest: {
        name: 'SnapPrompt',
        short_name: 'SnapPrompt',
        description: '离线可用的提示词素材库',
        theme_color: '#f4efe7',
        background_color: '#f4efe7',
        display: 'standalone',
        scope: '/',
        start_url: '/#/m',
        icons: [
          {
            src: `/icon-192.png?v=${ICON_VERSION}`,
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: `/icon-512.png?v=${ICON_VERSION}`,
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: `/icon-512.png?v=${ICON_VERSION}`,
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        cleanupOutdatedCaches: true,
        navigateFallback: '/index.html',
        runtimeCaching: [
          {
            urlPattern: ({ request, url }) =>
              request.method === 'GET' && url.pathname === '/datasets/manifest.json',
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'datasets-manifest',
            },
          },
          {
            urlPattern: ({ request, url }) =>
              request.method === 'GET' &&
              (url.pathname.startsWith('/datasets/data/') || url.pathname.startsWith('/datasets/images/')),
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'datasets-assets',
            },
          },
        ],
      },
      devOptions: {
        enabled: true,
      },
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
