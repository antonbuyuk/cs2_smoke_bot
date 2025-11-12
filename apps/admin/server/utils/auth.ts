import type { H3Event } from 'h3';

export type AuthSession = {
  userId: string;
  username: string;
  firstName: string;
  lastName?: string;
  photoUrl?: string;
  authDate: number;
};

export const getAuthSession = (event: H3Event): AuthSession | null => {
  const sessionCookie = getCookie(event, 'auth_session');

  if (!sessionCookie) {
    return null;
  }

  try {
    const session = JSON.parse(sessionCookie) as AuthSession;
    return session;
  } catch {
    return null;
  }
};

export const requireAuth = (event: H3Event): AuthSession => {
  const session = getAuthSession(event);

  if (!session) {
    throw createError({
      statusCode: 401,
      message: 'Authentication required',
    });
  }

  return session;
};

