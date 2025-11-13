import { createError } from 'h3';

import { getGrenadeTypes } from '@shared/database';

export default defineEventHandler(async (event) => {
  try {
    const grenadeTypes = await getGrenadeTypes();

    return {
      data: grenadeTypes,
    };
  } catch (error) {
    console.error('Failed to fetch grenade types:', error);
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to load grenade types',
      cause: error,
    });
  }
});

