import { createError } from 'h3';
import { basename } from 'path';

import { getMapById, setMapPositionImage } from '@shared/database';
import { deleteFile } from '../../../utils/storage';

export default defineEventHandler(async (event) => {
  const rawId = event.context.params?.id;
  const mapId = Number.parseInt(String(rawId), 10);

  if (Number.isNaN(mapId)) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid map id' });
  }

  const map = await getMapById(mapId);
  if (!map) {
    throw createError({ statusCode: 404, statusMessage: 'Map not found' });
  }

  if (map.position_image_url === null) {
    return { success: true, position_image_url: null };
  }

  const previousUrl = await setMapPositionImage(mapId, null);

  if (previousUrl && previousUrl.startsWith('/uploads/')) {
    try {
      await deleteFile(basename(previousUrl));
    } catch (error) {
      console.error('Failed to delete map image file:', error);
    }
  }

  return { success: true, position_image_url: null };
});
