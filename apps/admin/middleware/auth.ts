// Public routes that don't require authentication
const PUBLIC_PATHS = ['/', '/grenades'];

export default defineNuxtRouteMiddleware(async (to) => {
  const config = useRuntimeConfig();

  if (config.public.developMode) {
    return;
  }

  // Redirect authenticated users away from login
  if (to.path === '/login') {
    const { isAuthenticated, fetchUser } = useAuth();
    await fetchUser();
    if (isAuthenticated.value) {
      return navigateTo('/');
    }
    return;
  }

  // Public paths — allow guests
  if (PUBLIC_PATHS.some((p) => (p === '/' ? to.path === '/' : to.path.startsWith(p)))) {
    return;
  }

  const { isAuthenticated, fetchUser, isLoading } = useAuth();

  if (isLoading.value) {
    await fetchUser();
  }

  if (!isAuthenticated.value) {
    return navigateTo('/login');
  }
});
