import { createError } from 'h3';

import { deleteMap } from '@shared/database';

export default defineEventHandler(async (event) => {
  const rawId = event.context.params?.id;
  const parsedId = Number.parseInt(String(rawId), 10);

  if (Number.isNaN(parsedId)) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Invalid map id',
    });
  }

  try {
    const deletedCount = await deleteMap(parsedId);

    if (deletedCount === 0) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Map not found',
      });
    }

    return {
      success: true,
      deletedCount,
    };
  } catch (error) {
    if (error && typeof error === 'object' && 'statusCode' in error) {
      throw error;
    }

    const message = error instanceof Error ? error.message : 'Unknown error';
    throw createError({
      statusCode: 500,
      statusMessage: message.includes('не найдена') ? message : 'Failed to delete map',
      cause: error,
    });
  }
});


