import { getQuery, createError } from 'h3';

import { getAllSmokes, getSmokesByMap, getPendingSmokes, isValidMapName } from '@shared/database';
import { getAuthSession, isAdmin } from '../../utils/auth';
import type { RealMapKey } from '@shared/utils/types';

export default defineEventHandler(async (event) => {
  try {
    const query = getQuery(event);
    const mapParam = typeof query.map === 'string' ? query.map : undefined;
    const statusParam = typeof query.status === 'string' ? query.status : 'approved';

    if (statusParam === 'pending') {
      const session = getAuthSession(event);
      if (!session || !isAdmin(session.userId, session.role)) {
        throw createError({ statusCode: 403, statusMessage: 'Forbidden' });
      }
      const grenades = await getPendingSmokes();
      return { data: grenades };
    }

    if (mapParam) {
      const isValidMap = await isValidMapName(mapParam);
      if (!isValidMap) {
        throw createError({
          statusCode: 400,
          statusMessage: `Unknown map key: ${mapParam}`,
        });
      }
    }

    const grenades = mapParam
      ? await getSmokesByMap(mapParam as RealMapKey)
      : await getAllSmokes();

    return { data: grenades };
  } catch (error) {
    if ((error as any)?.statusCode) throw error;
    console.error('Failed to fetch grenades', error);
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to load grenades',
      cause: error,
    });
  }
});
