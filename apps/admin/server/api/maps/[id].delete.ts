import { createError } from 'h3';
import { basename } from 'path';

import { deleteMap, getMapById, RecordInUseError } from '@shared/database';
import { deleteFile } from '../../utils/storage';

export default defineEventHandler(async (event) => {
  const rawId = event.context.params?.id;
  const mapId = Number.parseInt(String(rawId), 10);

  if (Number.isNaN(mapId)) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid Map id' });
  }

  const map = await getMapById(mapId);

  try {
    const deletedCount = await deleteMap(mapId);

    if (deletedCount === 0) {
      throw createError({ statusCode: 404, statusMessage: 'Map not found' });
    }

    if (map?.position_image_url && map.position_image_url.startsWith('/uploads/')) {
      try {
        await deleteFile(basename(map.position_image_url));
      } catch (error) {
        console.error('Failed to delete map image file on map delete:', error);
      }
    }

    return { success: true, deletedCount };
  } catch (error) {
    if (error instanceof RecordInUseError) {
      throw createError({
        statusCode: 409,
        statusMessage: error.message,
        message: error.message,
        data: {
          recordType: error.recordType,
          recordId: error.recordId,
          usageCount: error.usageCount,
          message: error.message,
        },
      });
    }

    if (error && typeof error === 'object' && 'statusCode' in error) {
      throw error;
    }

    const message = error instanceof Error ? error.message : 'Unknown error';
    throw createError({
      statusCode: 500,
      statusMessage: message.includes('не найдена') ? message : 'Failed to delete карту',
      cause: error,
    });
  }
});
