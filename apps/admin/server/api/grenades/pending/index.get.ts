import { getPendingSmokes } from '@shared/database';

export default defineEventHandler(async () => {
  const grenades = await getPendingSmokes();
  return { data: grenades };
});
