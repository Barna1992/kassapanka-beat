import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// Relative base so the build works on GitHub Pages under /<repo>/.
export default defineConfig({
  base: './',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['kp-logo.jpeg', 'apple-icon-180.png'],
      workbox: { globPatterns: ['**/*.{js,mjs,css,html,png,jpeg}'], maximumFileSizeToCacheInBytes: 5 * 1024 * 1024 },
      manifest: {
        name: 'Kassapanka Beat',
        short_name: 'KP Beat',
        description: 'Metronomo visivo e setlist dei Kassapanka',
        start_url: '.',
        scope: '.',
        display: 'standalone',
        background_color: '#0e0b0a',
        theme_color: '#0e0b0a',
        lang: 'it',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
    }),
  ],
})
