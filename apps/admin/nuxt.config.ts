import { fileURLToPath } from 'url';

const sharedPath = fileURLToPath(new URL('../../packages/shared', import.meta.url));

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  alias: {
    '@shared': sharedPath,
  },
  typescript: {
    strict: true,
  },
  runtimeConfig: {
    telegramBotToken: process.env.BOT_TOKEN || '',
    databaseUrl: process.env.DATABASE_URL || '',
  },
});
