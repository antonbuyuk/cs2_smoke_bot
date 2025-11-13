import { readBody, createError } from 'h3';

import { addDifficulty } from '@shared/database';

type CreateDifficultyBody = {
  name: string;
  displayName: string;
};

const isValidDifficultyName = (name: string): boolean => {
  return /^[a-z0-9_]+$/.test(name) && name.length > 0 && name.length <= 50;
};

export default defineEventHandler(async (event) => {
  const payload = await readBody<CreateDifficultyBody>(event);

  if (!payload?.name || typeof payload.name !== 'string') {
    throw createError({
      statusCode: 400,
      statusMessage: 'name is required',
    });
  }

  if (!payload?.displayName || typeof payload.displayName !== 'string') {
    throw createError({
      statusCode: 400,
      statusMessage: 'displayName is required',
    });
  }

  if (!isValidDifficultyName(payload.name)) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Invalid difficulty name format. Use lowercase letters, numbers, and underscores only (max 50 chars)',
    });
  }

  if (payload.displayName.length === 0 || payload.displayName.length > 100) {
    throw createError({
      statusCode: 400,
      statusMessage: 'displayName must be between 1 and 100 characters',
    });
  }

  try {
    const newId = await addDifficulty(payload.name, payload.displayName);

    return {
      id: newId,
      name: payload.name,
      displayName: payload.displayName,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    throw createError({
      statusCode: 409,
      statusMessage: message.includes('уже существует') ? message : 'Failed to create difficulty',
      cause: error,
    });
  }
});

