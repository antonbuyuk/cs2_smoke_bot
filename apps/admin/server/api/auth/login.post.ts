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

  const body = await readBody<TelegramAuthData>(event);

  if (!body || !body.hash || !body.auth_date || !body.id) {
    throw createError({
      statusCode: 400,
      message: 'Invalid authentication data',
    });
  }

  const authDate = Number.parseInt(body.auth_date, 10);
  const currentTime = Math.floor(Date.now() / 1000);
  const timeDiff = currentTime - authDate;

  if (timeDiff > 86400) {
    throw createError({
      statusCode: 401,
      message: 'Authentication data expired',
    });
  }

  const dataCheckString = Object.keys(body)
    .filter((key) => key !== 'hash')
    .sort()
    .map((key) => `${key}=${body[key as keyof TelegramAuthData]}`)
    .join('\n');

  const secretKey = crypto.createHash('sha256').update(botToken).digest();
  const hmac = crypto.createHmac('sha256', secretKey).update(dataCheckString).digest('hex');

  if (hmac !== body.hash) {
    throw createError({
      statusCode: 401,
      message: 'Invalid authentication hash',
    });
  }

  try {
    const telegramResponse = await fetch(`https://api.telegram.org/bot${botToken}/getChat?chat_id=${body.id}`);
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

  const telegramId = Number.parseInt(body.id, 10);

  // Upsert user into DB
  const { role: dbRole } = await upsertUser({
    telegramId,
    username: body.username ?? null,
    firstName: body.first_name,
    lastName: body.last_name ?? null,
    photoUrl: body.photo_url ?? null,
  });

  // Seed admin role from env on first login if applicable
  const { getAdminIds } = await import('../../utils/auth');
  const adminIds = getAdminIds();
  if (adminIds.includes(telegramId)) {
    await setUserRole(telegramId, 'admin');
  }

  const role = adminIds.includes(telegramId) ? 'admin' : dbRole;

  const session = {
    userId: body.id,
    username: body.username || body.first_name,
    firstName: body.first_name,
    lastName: body.last_name,
    photoUrl: body.photo_url,
    authDate: authDate,
    role,
  };

  setCookie(event, 'auth_session', JSON.stringify(session), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7,
  });

  return {
    success: true,
    user: {
      id: session.userId,
      username: session.username,
      firstName: session.firstName,
      lastName: session.lastName,
      photoUrl: session.photoUrl,
      role: session.role,
    },
  };
});
