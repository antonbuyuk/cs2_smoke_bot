import { setSmokeStatus } from '@shared/database';

export default defineEventHandler(async (event) => {
  const rawId = event.context.params?.id;
  const parsedId = Number.parseInt(String(rawId), 10);

  if (Number.isNaN(parsedId)) {
    throw createError({ statusCode: 400, message: 'Invalid grenade id' });
  }

  await setSmokeStatus(parsedId, 'approved');
  return { success: true };
});
