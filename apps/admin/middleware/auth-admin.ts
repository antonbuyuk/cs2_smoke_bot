export default defineNuxtRouteMiddleware(async () => {
  const config = useRuntimeConfig();

  if (config.public.developMode) {
    return;
  }

  const { isAuthenticated, isAdmin, fetchUser, isLoading } = useAuth();

  if (isLoading.value) {
    await fetchUser();
  }

  if (!isAuthenticated.value) {
    return navigateTo('/login');
  }

  if (!isAdmin.value) {
    return navigateTo('/');
  }
});
