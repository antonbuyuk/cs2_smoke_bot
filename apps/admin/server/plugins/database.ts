import { initDatabase } from '@shared/database';

export default defineNitroPlugin(async (nitroApp) => {
  const config = useRuntimeConfig();

  // Set DATABASE_URL from runtime config if available
  if (config.databaseUrl && !process.env.DATABASE_URL) {
    process.env.DATABASE_URL = config.databaseUrl;
  }

  try {
    console.log('===================== <START> Initializing database =====================');
    await initDatabase();
    console.log('===================== <END> Initializing database =====================');
    console.log('===================== <START> BOT STARTED =====================');
  } catch (error) {
    console.error('[admin] Failed to initialize database');
    console.error(error);

    if (error instanceof Error) {
      console.error('\nTroubleshooting:');
      console.error('1. Make sure PostgreSQL is running');
      console.error('2. Check DATABASE_URL in .env file');
      console.error('3. Verify database exists: psql -U postgres -l | grep cs2_bot');
      console.error('4. See DATABASE_SETUP.md for detailed instructions');
    }

    throw error;
  }
});

