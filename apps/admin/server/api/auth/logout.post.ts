export default defineEventHandler(async (event) => {
  deleteCookie(event, 'auth_session');

  return {
    success: true,
  };
});

