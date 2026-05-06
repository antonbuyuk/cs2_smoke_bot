import crypto from 'crypto';
import { upsertUser, setUserRole } from '@shared/database';

type TelegramAuthData = {
  id: string;
  first_name: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
  auth_date: string;
  hash: string;
};

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig();
  const botToken = config.telegramBotToken;

  if (!botToken) {
    throw createError({
      statusCode: 500,
      message: 'Telegram bot token is not configured',
    });
  }

  const query = getQuery<TelegramAuthData>(event);

  if (!query || !query.hash || !query.auth_date || !query.id) {
    throw createError({
      statusCode: 400,
      message: 'Invalid authentication data',
    });
  }

  const authDate = Number.parseInt(query.auth_date, 10);
  const currentTime = Math.floor(Date.now() / 1000);
  const timeDiff = currentTime - authDate;

  if (timeDiff > 86400) {
    throw createError({
      statusCode: 401,
      message: 'Authentication data expired',
    });
  }

  const dataCheckString = Object.keys(query)
    .filter((key) => key !== 'hash')
    .sort()
    .map((key) => `${key}=${query[key as keyof TelegramAuthData]}`)
    .join('\n');

  const secretKey = crypto.createHash('sha256').update(botToken).digest();
  const hmac = crypto.createHmac('sha256', secretKey).update(dataCheckString).digest('hex');

  if (hmac !== query.hash) {
    throw createError({
      statusCode: 401,
      message: 'Invalid authentication hash',
    });
  }

  try {
    const telegramResponse = await fetch(`https://api.telegram.org/bot${botToken}/getChat?chat_id=${query.id}`);
    const telegramData = await telegramResponse.json();

    if (!telegramData.ok) {
      throw createError({
        statusCode: 401,
        message: 'Failed to verify user with Telegram',
      });
    }
  } catch (error) {
    console.warn('Telegram API verification failed, but hash is valid:', error);
  }

  const telegramId = Number.parseInt(query.id, 10);

  const { role: dbRole } = await upsertUser({
    telegramId,
    username: query.username ?? null,
    firstName: query.first_name,
    lastName: query.last_name ?? null,
    photoUrl: query.photo_url ?? null,
  });

  const { getAdminIds } = await import('../../utils/auth');
  const adminIds = getAdminIds();
  if (adminIds.includes(telegramId)) {
    await setUserRole(telegramId, 'admin');
  }

  const role = adminIds.includes(telegramId) ? 'admin' : dbRole;

  const session = {
    userId: query.id,
    username: query.username || query.first_name,
    firstName: query.first_name,
    lastName: query.last_name,
    photoUrl: query.photo_url,
    authDate: authDate,
    role,
  };

  setCookie(event, 'auth_session', JSON.stringify(session), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7,
  });

  return sendRedirect(event, '/', 302);
});
