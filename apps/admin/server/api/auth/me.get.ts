export default defineEventHandler(async (event) => {
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

