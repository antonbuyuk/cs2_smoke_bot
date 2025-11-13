import { getQuery, createError } from 'h3';

import { getAllSmokes, getSmokesByMap, isValidMapName } from '@shared/database';
import type { RealMapKey } from '@shared/utils/types';

export default defineEventHandler(async (event) => {
  try {
    const query = getQuery(event);
    const mapParam = typeof query.map === 'string' ? query.map : undefined;

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

    return {
      data: grenades,
    };
  } catch (error) {
    console.error('Failed to fetch grenades', error);
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to load grenades',
      cause: error,
    });
  }
});

