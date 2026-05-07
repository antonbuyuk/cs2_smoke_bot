import { createError } from 'h3';
import { deleteProgress } from '@shared/database';
import { requireUser } from '../../../utils/auth';

export default defineEventHandler(async (event) => {
  const session = requireUser(event);
  const userId = Number.parseInt(session.userId, 10);
  const granadeId = Number.parseInt(getRouterParam(event, 'granadeId') ?? '', 10);

  if (Number.isNaN(granadeId)) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid granadeId' });
  }

  if (Number.isNaN(userId)) {
    return { ok: true, removed: 0 };
  }

  const removed = await deleteProgress(userId, granadeId);
  return { ok: true, removed };
});
