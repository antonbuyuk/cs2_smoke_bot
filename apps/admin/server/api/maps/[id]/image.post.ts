import { createError, readMultipartFormData } from 'h3';
import { randomUUID } from 'crypto';
import { basename } from 'path';

import { getMapById, setMapPositionImage } from '@shared/database';
import { saveFile, deleteFile } from '../../../utils/storage';

const MAX_SIZE_BYTES = 10 * 1024 * 1024;
const ALLOWED_EXTENSIONS = new Set(['jpg', 'jpeg', 'png', 'gif', 'webp']);

const extractExtension = (filename: string): string | null => {
  const dotIndex = filename.lastIndexOf('.');
  if (dotIndex === -1 || dotIndex === filename.length - 1) {
    return null;
  }
  return filename.slice(dotIndex + 1).toLowerCase();
};

export default defineEventHandler(async (event) => {
  const rawId = event.context.params?.id;
  const mapId = Number.parseInt(String(rawId), 10);

  if (Number.isNaN(mapId)) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid map id' });
  }

  const formData = await readMultipartFormData(event);
  const file = formData?.find((part) => part.data && part.filename);

  if (!file || !file.data || !file.filename) {
    throw createError({ statusCode: 400, statusMessage: 'No image file provided' });
  }

  const ext = extractExtension(file.filename);
  if (!ext || !ALLOWED_EXTENSIONS.has(ext)) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Unsupported image format. Use jpg, jpeg, png, gif, or webp',
    });
  }

  if (file.data.length > MAX_SIZE_BYTES) {
    throw createError({ statusCode: 400, statusMessage: 'Image must be 10MB or smaller' });
  }

  const map = await getMapById(mapId);
  if (!map) {
    throw createError({ statusCode: 404, statusMessage: 'Map not found' });
  }

  const uniqueFilename = `${randomUUID()}.${ext}`;

  try {
    await saveFile(uniqueFilename, file.data);
  } catch (error) {
    console.error('Failed to save map image:', error);
    throw createError({
      statusCode: 500,
      statusMessage: `Failed to save image: ${error instanceof Error ? error.message : 'Unknown error'}`,
    });
  }

  const newFileId = `/uploads/${uniqueFilename}`;

  let previousUrl: string | null;
  try {
    previousUrl = await setMapPositionImage(mapId, newFileId);
  } catch (error) {
    try {
      await deleteFile(uniqueFilename);
    } catch (cleanupError) {
      console.error('Failed to rollback uploaded file:', cleanupError);
    }
    console.error('Failed to update map position image:', error);
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to update map position image',
    });
  }

  if (previousUrl && previousUrl.startsWith('/uploads/')) {
    try {
      await deleteFile(basename(previousUrl));
    } catch (error) {
      console.error('Failed to delete previous map image:', error);
    }
  }

  return {
    success: true,
    position_image_url: newFileId,
    url: `/api/media/${encodeURIComponent(newFileId)}`,
  };
});
