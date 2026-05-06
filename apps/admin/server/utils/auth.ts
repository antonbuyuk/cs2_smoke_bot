import type { H3Event } from 'h3';

export type AuthSession = {
  userId: string;
  username: string;
  firstName: string;
  lastName?: string;
  photoUrl?: string;
  authDate: number;
  role: 'admin' | 'user';
};

export const getAdminIds = (): number[] => {
  const adminIdsStr = process.env.ADMIN_IDS;
  if (!adminIdsStr) {
    console.warn('ADMIN_IDS not found in environment variables. No admin access will be granted.');
    return [];
  }
  return adminIdsStr
    .split(',')
    .map((id) => Number.parseInt(id.trim(), 10))
    .filter((id) => !Number.isNaN(id));
};

export const isAdmin = (userId: string, sessionRole?: 'admin' | 'user'): boolean => {
  if (sessionRole === 'admin') return true;
  const adminIds = getAdminIds();
  const userIdNum = Number.parseInt(userId, 10);
  return adminIds.includes(userIdNum);
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

const DEV_SESSION: AuthSession = {
  userId: 'dev-user-1',
  username: 'devuser',
  firstName: 'Dev',
  lastName: 'User',
  photoUrl: undefined,
  authDate: Date.now(),
  role: 'admin',
};

export const requireAuth = (event: H3Event): AuthSession => {
  const config = useRuntimeConfig(event);

  if (config.developMode) {
    return DEV_SESSION;
  }

  const session = getAuthSession(event);

  if (!session) {
    throw createError({
      statusCode: 401,
      message: 'Authentication required',
    });
  }

  return session;
};

export const requireUser = (event: H3Event): AuthSession => {
  return requireAuth(event);
};

export const requireAdmin = (event: H3Event): AuthSession => {
  const config = useRuntimeConfig(event);

  if (config.developMode) {
    return DEV_SESSION;
  }

  const session = requireAuth(event);

  if (!isAdmin(session.userId, session.role)) {
    throw createError({
      statusCode: 403,
      message: 'Admin access required',
    });
  }

  return session;
};
