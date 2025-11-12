import { getQuery, createError } from 'h3';

import { getAllSmokes, getSmokesByMap } from '@shared/database';
import { MAP_TYPES } from '@shared/config/constants';
import type { RealMapKey } from '@shared/utils/types';

const isRealMapKey = (value: string): value is RealMapKey =>
  Object.prototype.hasOwnProperty.call(MAP_TYPES, value) && value !== 'all';

export default defineEventHandler(async (event) => {
  try {
    const query = getQuery(event);
    const mapParam = typeof query.map === 'string' ? query.map : undefined;

    if (mapParam && !isRealMapKey(mapParam)) {
      throw createError({
        statusCode: 400,
        statusMessage: `Unknown map key: ${mapParam}`,
      });
    }

    const smokes = mapParam
      ? await getSmokesByMap(mapParam as RealMapKey)
      : await getAllSmokes();

    return {
      data: smokes,
    };
  } catch (error) {
    console.error('Failed to fetch smokes', error);
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to load smokes',
      cause: error,
    });
  }
});

