import { setUserRole } from '@shared/database';
import { getAuthSession } from '../../utils/auth';

export default defineEventHandler(async (event) => {
  const rawId = event.context.params?.id;
  const telegramId = Number.parseInt(String(rawId), 10);

  if (Number.isNaN(telegramId)) {
    throw createError({ statusCode: 400, message: 'Invalid user id' });
  }

  const session = getAuthSession(event);
  if (session && session.userId === String(telegramId)) {
    throw createError({ statusCode: 400, message: 'Cannot change your own role' });
  }

  const body = await readBody<{ role: 'admin' | 'user' }>(event);
  if (!body?.role || !['admin', 'user'].includes(body.role)) {
    throw createError({ statusCode: 400, message: 'Invalid role. Must be "admin" or "user"' });
  }

  await setUserRole(telegramId, body.role);
  return { success: true };
});
