import { ref, computed } from 'vue';

type User = {
  id: string;
  username: string;
  firstName: string;
  lastName?: string;
  photoUrl?: string;
};

const user = ref<User | null>(null);
const isLoading = ref(true);

// Моковый пользователь для режима разработки
const DEV_USER: User = {
  id: 'dev-user-1',
  username: 'devuser',
  firstName: 'Dev',
  lastName: 'User',
  photoUrl: undefined,
};

export const useAuth = () => {
  const config = useRuntimeConfig();
  const isAuthenticated = computed(() => user.value !== null);

  // В режиме разработки автоматически устанавливаем мокового пользователя при первом вызове
  if (config.public.developMode && !user.value && isLoading.value) {
    user.value = DEV_USER;
    isLoading.value = false;
  }

  const fetchUser = async () => {
    // В режиме разработки сразу устанавливаем мокового пользователя
    if (config.public.developMode) {
      user.value = DEV_USER;
      isLoading.value = false;
      return;
    }

    try {
      isLoading.value = true;
      const data = await $fetch<{ user: User }>('/api/auth/me');
      user.value = data.user;
    } catch (error: any) {
      // Если получили 401, не устанавливаем user в null здесь,
      // так как плагин уже обработает редирект
      if (error?.status === 401 || error?.statusCode === 401) {
        user.value = null;
        return;
      }
      user.value = null;
    } finally {
      isLoading.value = false;
    }
  };

  const login = async (authData: Record<string, string>) => {
    // В режиме разработки сразу возвращаем успех
    if (config.public.developMode) {
      user.value = DEV_USER;
      return { success: true };
    }

    try {
      const response = await $fetch<{ success: boolean; user: User }>('/api/auth/login', {
        method: 'POST',
        body: authData,
      });

      if (response.success) {
        user.value = response.user;
        return { success: true };
      }

      return { success: false, error: 'Login failed' };
    } catch (error: any) {
      let errorMessage = 'Login failed';

      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (error?.data?.message) {
        errorMessage = error.data.message;
      } else if (error?.message) {
        errorMessage = error.message;
      }

      // Специальная обработка ошибки доступа
      if (error?.status === 403 || error?.statusCode === 403) {
        errorMessage = 'Access denied. Admin privileges required.';
      }

      return { success: false, error: errorMessage };
    }
  };

  const logout = async () => {
    // В режиме разработки просто очищаем пользователя
    if (config.public.developMode) {
      user.value = null;
      return;
    }

    try {
      await $fetch('/api/auth/logout', {
        method: 'POST',
      });
      user.value = null;
      await navigateTo('/login');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  return {
    user: computed(() => user.value),
    isAuthenticated,
    isLoading: computed(() => isLoading.value),
    fetchUser,
    login,
    logout,
  };
};

