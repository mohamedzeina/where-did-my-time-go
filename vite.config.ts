/// <reference types="vitest/config" />
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

/**
 * Where the built app lives on GitHub Pages. A project site is served from a subfolder, so
 * every built URL — assets, the manifest, the service worker's scope — has to be prefixed
 * with it. Dev stays at the root, so `npm run dev` is just localhost:3000; `npm run preview`
 * serves the real build, prefix and all.
 */
const BASE = '/where-did-my-time-go/'

export default defineConfig(({ command }) => ({
  base: command === 'build' ? BASE : '/',
  server: {
    // Plain old port 3000, not whatever Vite picks in the 5170s.
    port: 3000,
  },
  preview: {
    port: 3000,
  },
  plugins: [
    react(),
    // Installable, and fully usable offline: every built file is precached, and the data
    // already lives in IndexedDB. New versions take over on the next load.
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
      manifest: {
        name: 'where did my time go?',
        short_name: 'Time',
        description: 'A timer that tracks where your time goes, with history and charts.',
        id: BASE,
        start_url: BASE,
        scope: BASE,
        display: 'standalone',
        orientation: 'any',
        background_color: '#12163a',
        theme_color: '#12163a',
        icons: [
          { src: 'pwa-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'pwa-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
          { src: 'icon.svg', sizes: 'any', type: 'image/svg+xml' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        navigateFallback: `${BASE}index.html`,
      },
    }),
  ],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    css: false,
  },
}))
