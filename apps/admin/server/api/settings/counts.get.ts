import { createError } from 'h3';

import { getReferenceTablesCounts } from '@shared/database';

export default defineEventHandler(async (event) => {
  try {
    const counts = await getReferenceTablesCounts();

    return {
      data: counts,
    };
  } catch (error) {
    console.error('Failed to fetch reference tables counts:', error);
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to load reference tables counts',
      cause: error,
    });
  }
});

