import { getProgressByUser } from '@shared/database';
import type { ProgressMap } from '@shared/utils/types';
import { requireUser } from '../../../utils/auth';

export default defineEventHandler(async (event) => {
  const session = requireUser(event);
  const userId = Number.parseInt(session.userId, 10);

  if (Number.isNaN(userId)) {
    return { data: {} as ProgressMap };
  }

  const records = await getProgressByUser(userId);
  const data: ProgressMap = {};
  for (const r of records) {
    data[r.granade_id] = r.status;
  }
  return { data };
});
