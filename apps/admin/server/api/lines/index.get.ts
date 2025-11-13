import { createError } from 'h3';

import { getLines } from '@shared/database';

export default defineEventHandler(async (event) => {
  try {
    const lines = await getLines();

    return {
      data: lines,
    };
  } catch (error) {
    console.error('Failed to fetch lines:', error);
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to load lines',
      cause: error,
    });
  }
});

