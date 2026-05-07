import { fileURLToPath } from 'url';

const sharedPath = fileURLToPath(new URL('../../packages/shared', import.meta.url));

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  modules: ['@nuxtjs/tailwindcss', '@nuxtjs/i18n', '@vite-pwa/nuxt'],
  css: ['~/assets/styles/main.scss'],
  alias: {
    '@shared': sharedPath,
  },
  typescript: {
    strict: true,
  },
  vite: {
    server: {
      hmr: {
        clientPort: 443,
      },
      // Разрешаем все хосты для работы с ngrok
      allowedHosts: [
        '.ngrok.io',
        '.ngrok-free.app',
        '.ngrok-free.dev',
        'localhost',
      ],
    },
  },
  devServer: {
    // В режиме разработки используем localhost, иначе 0.0.0.0 для ngrok
    host: process.env.DEVELOP_MODE === 'true' ? 'localhost' : '0.0.0.0',
    port: 3000,
  },
  runtimeConfig: {
    telegramBotToken: process.env.BOT_TOKEN || '',
    telegramBotUsername: process.env.BOT_USERNAME || '',
    databaseUrl: process.env.DATABASE_URL || '',
    developMode: process.env.DEVELOP_MODE === 'true',
    public: {
      telegramBotUsername: process.env.BOT_USERNAME || '',
      developMode: process.env.DEVELOP_MODE === 'true',
    },
  },
  i18n: {
    locales: [
      { code: 'ru', iso: 'ru-RU', file: 'ru.json', name: 'Русский' },
      { code: 'en', iso: 'en-US', file: 'en.json', name: 'English' },
    ],
    langDir: 'locales',
    defaultLocale: 'ru',
    strategy: 'no_prefix',
    detectBrowserLanguage: {
      useCookie: true,
      cookieKey: 'i18n_redirected',
      redirectOn: 'root',
    },
    vueI18n: './i18n.config.ts',
  },
  pwa: {
    registerType: 'autoUpdate',
    manifest: {
      name: 'CS2 Smoke Bot',
      short_name: 'CS2 Smokes',
      description: 'Личный flashcard-deck для line-up\'ов гранат CS2',
      theme_color: '#0d0f14',
      background_color: '#0d0f14',
      display: 'standalone',
      scope: '/',
      start_url: '/',
      lang: 'ru',
      icons: [
        { src: '/icons/logo-small.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
        { src: '/icons/logo-large.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
        { src: '/icons/logo-large.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
      ],
    },
    workbox: {
      navigateFallback: '/',
      navigateFallbackDenylist: [/^\/api\//, /^\/login/],
      globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2}'],
      runtimeCaching: [
        // Медиа гранат — file_id immutable, кэшируем агрессивно
        {
          urlPattern: /\/api\/media\//,
          handler: 'CacheFirst',
          options: {
            cacheName: 'media-cache',
            expiration: { maxEntries: 300, maxAgeSeconds: 60 * 60 * 24 * 30 },
            cacheableResponse: { statuses: [0, 200] },
          },
        },
        // Авторизация — никогда не кэшировать
        {
          urlPattern: /\/api\/auth\//,
          handler: 'NetworkOnly',
        },
        // Личный прогресс — никогда не кэшировать (всегда свежий)
        {
          urlPattern: /\/api\/me\//,
          handler: 'NetworkOnly',
        },
        // Остальные API — мгновенный отклик + фоновое обновление
        {
          urlPattern: /\/api\//,
          handler: 'StaleWhileRevalidate',
          options: {
            cacheName: 'api-cache',
            cacheableResponse: { statuses: [0, 200] },
          },
        },
      ],
    },
    client: {
      installPrompt: true,
    },
    devOptions: {
      // SW в dev мешает HMR; включай вручную при отладке кэшей
      enabled: false,
    },
  },
});
