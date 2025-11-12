export default defineNuxtPlugin(() => {
  // Создаем кастомный $fetch с обработкой 401 ошибок
  const customFetch = $fetch.create({
    onResponseError({ response, request }) {
      // Пропускаем обработку для endpoints авторизации
      const url = typeof request === 'string' ? request : request?.toString() || '';
      if (url.includes('/api/auth/login') || url.includes('/api/auth/logout')) {
        return;
      }

      if (response.status === 401) {
        // Получаем useAuth только когда нужно
        const { logout } = useAuth();
        // Очищаем сессию и редиректим на логин
        logout().then(() => {
          navigateTo('/login');
        });
      }
    },
  });

  // Переопределяем глобальный $fetch
  (globalThis as any).$fetch = customFetch;
});

