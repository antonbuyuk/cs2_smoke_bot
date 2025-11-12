import { createError, defineEventHandler } from 'h3';

import { getSmokeById, getSmokeMedia } from '@shared/database';

export default defineEventHandler(async (event) => {
  const rawId = event.context.params?.id;
  const parsedId = Number.parseInt(String(rawId), 10);

  if (Number.isNaN(parsedId)) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Invalid smoke id',
    });
  }

  const smoke = await getSmokeById(parsedId);

  if (!smoke) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Smoke not found',
    });
  }

  const media = await getSmokeMedia(parsedId);

  return {
    smoke,
    media,
  };
});

