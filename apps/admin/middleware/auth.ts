export default defineNuxtRouteMiddleware(async (to) => {
  const config = useRuntimeConfig();

  // В режиме разработки пропускаем все проверки авторизации
  if (config.public.developMode) {
    return;
  }

  // Пропускаем страницу логина без проверки
  if (to.path === '/login') {
    const { isAuthenticated, fetchUser } = useAuth();

    // Если еще не загрузили данные пользователя, загружаем
    await fetchUser();

    // Если авторизован и пытается зайти на страницу логина, редиректим на главную
    if (isAuthenticated.value) {
      return navigateTo('/');
    }

    return;
  }

  // Для всех остальных страниц проверяем авторизацию
  const { isAuthenticated, fetchUser, isLoading } = useAuth();

  // Если еще не загрузили данные пользователя, загружаем
  if (isLoading.value) {
    await fetchUser();
  }

  // Если не авторизован, редиректим на логин
  if (!isAuthenticated.value) {
    return navigateTo('/login');
  }
});

