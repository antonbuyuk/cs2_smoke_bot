export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig(event);

  // В режиме разработки возвращаем мокового пользователя
  if (config.developMode) {
    return {
      user: {
        id: 'dev-user-1',
        username: 'devuser',
        firstName: 'Dev',
        lastName: 'User',
        photoUrl: undefined,
      },
    };
  }

  const sessionCookie = getCookie(event, 'auth_session');

  if (!sessionCookie) {
    throw createError({
      statusCode: 401,
      message: 'Not authenticated',
    });
  }

  try {
    const session = JSON.parse(sessionCookie);
    return {
      user: {
        id: session.userId,
        username: session.username,
        firstName: session.firstName,
        lastName: session.lastName,
        photoUrl: session.photoUrl,
      },
    };
  } catch {
    throw createError({
      statusCode: 401,
      message: 'Invalid session',
    });
  }
});

