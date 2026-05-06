import { fileURLToPath } from 'url';

const sharedPath = fileURLToPath(new URL('../../packages/shared', import.meta.url));

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  modules: ['@nuxtjs/tailwindcss', '@nuxtjs/i18n'],
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
});
