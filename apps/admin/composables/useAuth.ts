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

export const useAuth = () => {
  const isAuthenticated = computed(() => user.value !== null);

  const fetchUser = async () => {
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
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Login failed';
      return { success: false, error: errorMessage };
    }
  };

  const logout = async () => {
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

