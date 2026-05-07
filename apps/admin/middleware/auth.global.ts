const PUBLIC_PATHS = ['/', '/grenades'];
const ADMIN_PATHS = ['/users', '/moderation', '/settings'];

const matchesPrefix = (path: string, prefix: string) =>
  prefix === '/' ? path === '/' : path === prefix || path.startsWith(prefix + '/');

export default defineNuxtRouteMiddleware(async (to) => {
  const config = useRuntimeConfig();

  if (config.public.developMode) {
    return;
  }

  const { isAuthenticated, isAdmin, fetchUser, isLoading } = useAuth();

  if (isLoading.value) {
    await fetchUser();
  }

  if (to.path === '/login') {
    if (isAuthenticated.value) {
      return navigateTo('/');
    }
    return;
  }

  if (PUBLIC_PATHS.some((p) => matchesPrefix(to.path, p))) {
    return;
  }

  if (!isAuthenticated.value) {
    return navigateTo('/login');
  }

  if (ADMIN_PATHS.some((p) => matchesPrefix(to.path, p)) && !isAdmin.value) {
    return navigateTo('/');
  }
});
