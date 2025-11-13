import { readBody, createError } from 'h3';

import { addSmoke, saveSmokeMediaBatch, isValidMapName } from '@shared/database';
import type { NewSmokeInput, RealMapKey, MediaType } from '@shared/utils/types';

type CreateGrenadeBody = NewSmokeInput & {
  mapName: string;
  mediaFiles?: Array<{ fileId: string; mediaType: MediaType; sortOrder: number }>;
};

export default defineEventHandler(async (event) => {
  const payload = await readBody<CreateGrenadeBody>(event);

  if (!payload?.mapName || typeof payload.mapName !== 'string') {
    throw createError({
      statusCode: 400,
      statusMessage: 'mapName is required',
    });
  }

  const isValidMap = await isValidMapName(payload.mapName);
  if (!isValidMap) {
    throw createError({
      statusCode: 400,
      statusMessage: `Unknown map key: ${payload.mapName}`,
    });
  }

  const grenadeData: NewSmokeInput = {
    name: payload.name,
    lineup_instructions: payload.lineup_instructions,
    imageUrl: payload.imageUrl ?? null,
    difficulty: payload.difficulty,
    side: payload.side,
    line: payload.line ?? null,
    grenadeType: payload.grenadeType,
  };

  try {
    const newId = await addSmoke(payload.mapName, grenadeData);

    if (!newId || newId === 0) {
      throw new Error('Failed to create grenade: invalid ID returned');
    }

    // Сохраняем медиа файлы, если они есть
    if (payload.mediaFiles && payload.mediaFiles.length > 0) {
      console.log('Saving media files for grenade ID:', newId);
      console.log('Media files payload:', JSON.stringify(payload.mediaFiles, null, 2));

      const mediaData = payload.mediaFiles.map((media) => {
        if (!media.fileId || typeof media.fileId !== 'string') {
          throw new Error(`Invalid fileId in media: ${JSON.stringify(media)}`);
        }
        if (!media.mediaType || (media.mediaType !== 'photo' && media.mediaType !== 'video')) {
          throw new Error(`Invalid mediaType in media: ${JSON.stringify(media)}`);
        }
        if (typeof media.sortOrder !== 'number') {
          throw new Error(`Invalid sortOrder in media: ${JSON.stringify(media)}`);
        }

        return {
          fileId: media.fileId,
          mediaType: media.mediaType,
          caption: null,
          sortOrder: media.sortOrder,
        };
      });

      console.log('Processed media data:', JSON.stringify(mediaData, null, 2));
      await saveSmokeMediaBatch(newId, mediaData);
      console.log('Media files saved successfully');
    }

    return {
      id: newId,
    };
  } catch (error) {
    console.error('Error creating grenade entry:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    throw createError({
      statusCode: 500,
      statusMessage: `Failed to create grenade entry: ${errorMessage}`,
      cause: error,
    });
  }
});

