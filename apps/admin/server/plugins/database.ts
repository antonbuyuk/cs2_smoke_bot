import { initDatabase } from '@shared/database';

export default defineNitroPlugin(async () => {
  try {
    console.log('===================== <START> Initializing database =====================');
    await initDatabase();
    console.log('===================== <END> Initializing database =====================');
    console.log('===================== <START> BOT STARTED =====================');
  } catch (error) {
    console.error('[admin] Failed to initialize database', error);
    throw error;
  }
});

