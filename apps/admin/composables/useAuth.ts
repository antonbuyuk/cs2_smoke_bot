import { computed } from 'vue';

type User = {
  id: string;
  username: string;
  firstName: string;
  lastName?: string;
  photoUrl?: string;
  role: 'admin' | 'user';
};

const DEV_USER: User = {
  id: 'dev-user-1',
  username: 'devuser',
  firstName: 'Dev',
  lastName: 'User',
  photoUrl: undefined,
  role: 'admin',
};

export const useAuth = () => {
  const config = useRuntimeConfig();
  const user = useState<User | null>('auth:user', () => null);
  const isLoading = useState<boolean>('auth:loading', () => true);

  const isAuthenticated = computed(() => user.value !== null);
  const isAdmin = computed(() => user.value?.role === 'admin');

  if (config.public.developMode && !user.value && isLoading.value) {
    user.value = DEV_USER;
    isLoading.value = false;
  }

  const fetchUser = async () => {
    if (config.public.developMode) {
      user.value = DEV_USER;
      isLoading.value = false;
      return;
    }

    try {
      isLoading.value = true;
      // На SSR прокидываем cookie из исходного запроса браузера,
      // иначе $fetch к /api/auth/me пойдёт без сессии и вернёт 401.
      const headers = import.meta.server ? useRequestHeaders(['cookie']) : undefined;
      const data = await $fetch<{ user: User }>('/api/auth/me', { headers });
      user.value = data.user;
    } catch (error: any) {
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

      return { success: false, error: errorMessage };
    }
  };

  const logout = async () => {
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
    isAdmin,
    isLoading: computed(() => isLoading.value),
    fetchUser,
    login,
    logout,
  };
};
