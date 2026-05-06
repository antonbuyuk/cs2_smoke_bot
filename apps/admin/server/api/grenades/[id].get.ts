import { createError, defineEventHandler } from 'h3';

import { getSmokeById, getSmokeMedia } from '@shared/database';
import { getAuthSession, isAdmin } from '../../utils/auth';

export default defineEventHandler(async (event) => {
  const rawId = event.context.params?.id;
  const parsedId = Number.parseInt(String(rawId), 10);

  if (Number.isNaN(parsedId)) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Invalid grenade id',
    });
  }

  const grenade = await getSmokeById(parsedId);

  if (!grenade) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Grenade not found',
    });
  }

  if (grenade.status !== 'approved') {
    const session = getAuthSession(event);
    const adminUser = session && isAdmin(session.userId, session.role);
    const isOwner = session && session.userId === String(grenade.created_by);

    if (!adminUser && !isOwner) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Grenade not found',
      });
    }
  }

  const media = await getSmokeMedia(parsedId);

  return {
    smoke: grenade,
    media,
  };
});
