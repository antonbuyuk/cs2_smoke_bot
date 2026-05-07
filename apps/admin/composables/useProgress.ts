import { computed } from 'vue';
import type { ProgressMap, ProgressStatus } from '@shared/utils/types';

export const useProgress = () => {
  const progress = useState<ProgressMap>('flashcard:progress', () => ({}));
  const isLoaded = useState<boolean>('flashcard:loaded', () => false);
  const { isAuthenticated } = useAuth();

  const fetchProgress = async () => {
    if (!isAuthenticated.value || isLoaded.value) return;
    try {
      const headers = import.meta.server ? useRequestHeaders(['cookie']) : undefined;
      const data = await $fetch<{ data: ProgressMap }>('/api/me/progress', { headers });
      progress.value = data.data ?? {};
      isLoaded.value = true;
    } catch {
      progress.value = {};
      isLoaded.value = true;
    }
  };

  const statusOf = (granadeId: number): ProgressStatus | null => progress.value[granadeId] ?? null;

  const setStatus = async (granadeId: number, status: ProgressStatus) => {
    const prev = progress.value[granadeId];
    progress.value = { ...progress.value, [granadeId]: status };
    try {
      await $fetch(`/api/me/progress/${granadeId}`, {
        method: 'PUT',
        body: { status },
      });
    } catch (error) {
      if (prev === undefined) {
        const next = { ...progress.value };
        delete next[granadeId];
        progress.value = next;
      } else {
        progress.value = { ...progress.value, [granadeId]: prev };
      }
      throw error;
    }
  };

  const clearStatus = async (granadeId: number) => {
    const prev = progress.value[granadeId];
    if (prev === undefined) return;
    const next = { ...progress.value };
    delete next[granadeId];
    progress.value = next;
    try {
      await $fetch(`/api/me/progress/${granadeId}`, { method: 'DELETE' });
    } catch (error) {
      progress.value = { ...progress.value, [granadeId]: prev };
      throw error;
    }
  };

  const learningIds = computed(() =>
    Object.entries(progress.value)
      .filter(([, s]) => s === 'learning')
      .map(([id]) => Number.parseInt(id, 10)),
  );

  return {
    progress: computed(() => progress.value),
    isLoaded: computed(() => isLoaded.value),
    learningIds,
    fetchProgress,
    statusOf,
    setStatus,
    clearStatus,
  };
};
