import { readBody, createError } from 'h3';

import { addSmoke } from '@shared/database';
import { MAP_TYPES } from '@shared/config/constants';
import type { NewSmokeInput, RealMapKey } from '@shared/utils/types';

const isRealMapKey = (value: string): value is RealMapKey =>
  Object.prototype.hasOwnProperty.call(MAP_TYPES, value) && value !== 'all';

type CreateGrenadeBody = NewSmokeInput & {
  mapName: string;
};

export default defineEventHandler(async (event) => {
  const payload = await readBody<CreateGrenadeBody>(event);

  if (!payload?.mapName || typeof payload.mapName !== 'string') {
    throw createError({
      statusCode: 400,
      statusMessage: 'mapName is required',
    });
  }

  if (!isRealMapKey(payload.mapName)) {
    throw createError({
      statusCode: 400,
      statusMessage: `Unknown map key: ${payload.mapName}`,
    });
  }

  const grenadeData: NewSmokeInput = {
    name: payload.name,
    lineup_instructions: payload.lineup_instructions,
    imageUrl: payload.imageUrl ?? null,
    difficulty: payload.difficulty,
    side: payload.side,
    line: payload.line ?? null,
    grenadeType: payload.grenadeType,
  };

  try {
    const newId = await addSmoke(payload.mapName, grenadeData);

    return {
      id: newId,
    };
  } catch (error) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to create grenade entry',
      cause: error,
    });
  }
});

