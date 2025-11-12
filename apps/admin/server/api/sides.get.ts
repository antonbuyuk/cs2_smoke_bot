import { createError } from 'h3';

import { getSides } from '@shared/database';

export default defineEventHandler(async (event) => {
  try {
    const sides = await getSides();

    return {
      data: sides,
    };
  } catch (error) {
    console.error('Failed to fetch sides:', error);
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to load sides',
      cause: error,
    });
  }
});

