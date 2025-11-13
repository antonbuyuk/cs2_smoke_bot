import { createError } from 'h3';

import { getDifficulties } from '@shared/database';

export default defineEventHandler(async (event) => {
  try {
    const difficulties = await getDifficulties();

    return {
      data: difficulties,
    };
  } catch (error) {
    console.error('Failed to fetch difficulties:', error);
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to load difficulties',
      cause: error,
    });
  }
});

