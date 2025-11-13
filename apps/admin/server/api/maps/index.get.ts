import { createError } from 'h3';

import { getMaps } from '@shared/database';

export default defineEventHandler(async (event) => {
  try {
    const maps = await getMaps();

    return {
      data: maps,
    };
  } catch (error) {
    console.error('Failed to fetch maps:', error);
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to load maps',
      cause: error,
    });
  }
});

