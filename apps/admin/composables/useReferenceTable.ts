import { ref, computed } from 'vue';

type ReferenceRecord = {
  id: number;
  name: string;
  display_name: string;
};

type ReferenceTableConfig = {
  apiPath: string;
  itemName: string;
  itemNamePlural: string;
  itemNameLowercase: string;
};

export const useReferenceTable = async <T extends ReferenceRecord>(config: ReferenceTableConfig) => {
  const { data, pending, error, refresh } = await useFetch(`/api/${config.apiPath}`, {
    transform: (response: { data: T[] }) => response.data,
  });

  const items = computed(() => data.value ?? []);

  const showAddForm = ref(false);
  const isAdding = ref(false);
  const addError = ref<string | null>(null);
  const newItem = ref({
    name: '',
    displayName: '',
  });

  const closeAddForm = () => {
    showAddForm.value = false;
    newItem.value = { name: '', displayName: '' };
    addError.value = null;
  };

  const handleAdd = async () => {
    if (!newItem.value.name || !newItem.value.displayName) {
      return;
    }

    isAdding.value = true;
    addError.value = null;

    try {
      await $fetch(`/api/${config.apiPath}`, {
        method: 'POST',
        body: {
          name: newItem.value.name.toLowerCase().trim(),
          displayName: newItem.value.displayName.trim(),
        },
      });

      await refresh();
      closeAddForm();
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : `Failed to add ${config.itemNameLowercase}`;
      addError.value = errorMessage;
    } finally {
      isAdding.value = false;
    }
  };

  const deletingIds = ref<Set<number>>(new Set());
  const deleteError = ref<string | null>(null);

  const handleDelete = async (id: number) => {
    if (deletingIds.value.has(id)) {
      return;
    }

    deletingIds.value.add(id);
    deleteError.value = null;

    try {
      await $fetch(`/api/${config.apiPath}/${id}`, {
        method: 'DELETE',
      });

      await refresh();
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : `Failed to delete ${config.itemNameLowercase}`;
      deleteError.value = errorMessage;
    } finally {
      deletingIds.value.delete(id);
    }
  };

  const isDeleting = (id: number) => deletingIds.value.has(id);

  return {
    items,
    pending,
    error,
    showAddForm,
    isAdding,
    addError,
    newItem,
    closeAddForm,
    handleAdd,
    handleDelete,
    isDeleting,
    deleteError,
  };
};

