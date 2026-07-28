import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import compression from 'vite-plugin-compression'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    compression({ algorithm: 'brotliCompress' }),
    VitePWA({
      registerType: 'autoUpdate',
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
        runtimeCaching: [
          {
            // Только статичные файлы (фото техники) можно отдавать из кеша.
            // Данные REST/Auth кешировать нельзя: удалённые строки возвращались
            // из кеша service worker после сохранения или перезагрузки страницы.
            urlPattern: /^https:\/\/stjgdteebhiejcvqckfu\.supabase\.co\/storage\/v1\/object\/public\/.*$/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'supabase-storage-cache',
              expiration: { maxEntries: 50, maxAgeSeconds: 300 }
            }
          },
          {
            urlPattern: /^https:\/\/stjgdteebhiejcvqckfu\.supabase\.co\/(rest|auth)\/.*$/i,
            handler: 'NetworkOnly'
          }
        ]
      }
    })
  ],
  server: {
    headers: {
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'X-XSS-Protection': '1; mode=block',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      'Permissions-Policy': 'camera=(), microphone=(), geolocation=()'
    }
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          supabase: ['@supabase/supabase-js']
        }
      }
    },
    target: 'esnext',
    sourcemap: false,
    chunkSizeWarningLimit: 1000
  }
})
