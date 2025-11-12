import { fileURLToPath } from 'url';

const sharedPath = fileURLToPath(new URL('../../packages/shared', import.meta.url));

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  modules: ['@nuxtjs/tailwindcss'],
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
    host: '0.0.0.0',
  },
  runtimeConfig: {
    telegramBotToken: process.env.BOT_TOKEN || '',
    telegramBotUsername: process.env.BOT_USERNAME || '',
    databaseUrl: process.env.DATABASE_URL || '',
    public: {
      telegramBotUsername: process.env.BOT_USERNAME || '',
    },
  },
});
