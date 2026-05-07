import { readBody, createError } from 'h3';
import { upsertProgress } from '@shared/database';
import type { ProgressStatus } from '@shared/utils/types';
import { requireUser } from '../../../utils/auth';

const VALID_STATUSES: ProgressStatus[] = ['want', 'learning', 'learned'];

export default defineEventHandler(async (event) => {
  const session = requireUser(event);
  const userId = Number.parseInt(session.userId, 10);
  const granadeId = Number.parseInt(getRouterParam(event, 'granadeId') ?? '', 10);

  if (Number.isNaN(granadeId)) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid granadeId' });
  }

  const body = await readBody<{ status?: string }>(event);
  const status = body?.status as ProgressStatus | undefined;

  if (!status || !VALID_STATUSES.includes(status)) {
    throw createError({
      statusCode: 400,
      statusMessage: `status must be one of: ${VALID_STATUSES.join(', ')}`,
    });
  }

  if (Number.isNaN(userId)) {
    return { ok: true, status };
  }

  await upsertProgress(userId, granadeId, status);
  return { ok: true, status };
});
