import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

const THEME = '#0f766e';

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      // Service Worker propio (src/sw.ts); el plugin solo inyecta la lista de precaché.
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.ts',
      // 'prompt': la actualización espera a que el usuario la acepte (UC-06).
      registerType: 'prompt',
      injectManifest: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico,webmanifest}'],
      },
      devOptions: { enabled: true, type: 'module' },
      manifest: {
        id: '/',
        name: 'FieldReport',
        short_name: 'FieldReport',
        description: 'Reportes de servicio técnico que funcionan sin internet',
        lang: 'es',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        orientation: 'portrait',
        theme_color: THEME,
        background_color: '#f8fafc',
        icons: [
          { src: 'pwa-64x64.png', sizes: '64x64', type: 'image/png' },
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          {
            src: 'maskable-icon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
    }),
  ],
  server: {
    host: true,
    // Dominios de túneles HTTPS para probar en el celular.
    allowedHosts: [
      '.ngrok-free.dev',
      '.ngrok-free.app',
      '.ngrok.app',
      '.trycloudflare.com',
    ],
    // La API cuelga del mismo origen: el celular solo necesita llegar al túnel de la web.
    proxy: {
      '/api': {
        target: process.env.API_PROXY_TARGET ?? 'http://localhost:3000',
      },
    },
  },
});
