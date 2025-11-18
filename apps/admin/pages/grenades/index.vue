
<script setup lang="ts">
import { computed, ref, watch } from 'vue';

import {
  getMapName,
  getSideName,
  getGrenadeTypeName,
  getDifficultyName,
  getLineName,
} from '@shared/config/constants';
import type { SmokeWithMap } from '@shared/utils/types';

definePageMeta({
  layout: 'default',
});

const { t } = useI18n();

const selectedMap = ref<'all' | string>('all');
const showAddForm = ref(false);
const isSubmitting = ref(false);
const addError = ref<string | null>(null);
const addSuccess = ref(false);

// Загружаем данные из справочных таблиц
const { data: mapsData } = await useFetch('/api/maps', {
  transform: (response: { data: Array<{ id: number; name: string; display_name: string }> }) => response.data,
});

const { data: sidesData } = await useFetch('/api/sides', {
  transform: (response: { data: Array<{ id: number; name: string; display_name: string }> }) => response.data,
});

const { data: difficultiesData } = await useFetch('/api/difficulties', {
  transform: (response: { data: Array<{ id: number; name: string; display_name: string }> }) => response.data,
});

const { data: linesData } = await useFetch('/api/lines', {
  transform: (response: { data: Array<{ id: number; name: string; display_name: string }> }) => response.data,
});

const { data: grenadeTypesData } = await useFetch('/api/grenade-types', {
  transform: (response: { data: Array<{ id: number; name: string; display_name: string }> }) => response.data,
});

const maps = computed(() => mapsData.value ?? []);
const sides = computed(() => sidesData.value ?? []);
const difficulties = computed(() => difficultiesData.value ?? []);
const lines = computed(() => linesData.value ?? []);
const grenadeTypes = computed(() => grenadeTypesData.value ?? []);

// Форма добавления гранаты
const formData = ref({
  name: '',
  mapName: '',
  side: '',
  difficulty: '',
  line: '',
  grenadeType: '',
  lineup_instructions: '',
});

// Загруженные файлы с порядком
type UploadedFile = {
  id: string;
  file: File;
  preview: string;
  mediaType: 'photo' | 'video';
  sortOrder: number;
};

const uploadedFiles = ref<UploadedFile[]>([]);
const isUploading = ref(false);
const uploadError = ref<string | null>(null);

const mapOptions = computed(() => {
  return maps.value.map((map) => ({
    value: map.name,
    label: map.display_name,
  }));
});

const queryParams = computed(() => {
  if (selectedMap.value === 'all') {
    return {};
  }

  return { map: selectedMap.value };
});

const { data, pending, error, refresh } = await useFetch('/api/grenades', {
  query: queryParams,
  transform: (response: { data: SmokeWithMap[] }) => response.data,
});

const grenades = computed(() => data.value ?? []);

watch(selectedMap, () => {
  refresh();
});

const errorMessage = computed(() => {
  if (!error.value) {
    return '';
  }

  return t('pages.grenades.error');
});

// Функции для работы с файлами
const handleFileSelect = (event: Event) => {
  const input = event.target as HTMLInputElement;
  if (input.files) {
    addFiles(Array.from(input.files));
  }
};

const addFiles = (files: File[]) => {
  const remainingSlots = 10 - uploadedFiles.value.length;
  const filesToAdd = files.slice(0, remainingSlots);

  filesToAdd.forEach((file) => {
    const id = `${Date.now()}-${Math.random()}`;
    const isVideo = file.type.startsWith('video/');
    const mediaType = isVideo ? 'video' : 'photo';
    const preview = mediaType === 'photo' ? URL.createObjectURL(file) : '';

    uploadedFiles.value.push({
      id,
      file,
      preview,
      mediaType,
      sortOrder: uploadedFiles.value.length,
    });
  });

  if (files.length > remainingSlots) {
    uploadError.value = t('pages.grenades.addForm.maxFilesReached');
  }
};

const removeFile = (id: string) => {
  const index = uploadedFiles.value.findIndex((f) => f.id === id);
  if (index !== -1 && uploadedFiles.value[index]) {
    // Освобождаем URL превью
    const fileToRemove = uploadedFiles.value[index];
    if (fileToRemove.preview) {
      URL.revokeObjectURL(fileToRemove.preview);
    }
    uploadedFiles.value.splice(index, 1);
    // Обновляем порядок
    uploadedFiles.value.forEach((f, i) => {
      f.sortOrder = i;
    });
  }
};

const moveFile = (fromIndex: number, toIndex: number) => {
  const file = uploadedFiles.value[fromIndex];
  if (!file) return;

  uploadedFiles.value.splice(fromIndex, 1);
  uploadedFiles.value.splice(toIndex, 0, file);
  // Обновляем порядок
  uploadedFiles.value.forEach((f, i) => {
    f.sortOrder = i;
  });
};

const handleDragStart = (event: DragEvent, index: number) => {
  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', String(index));
  }
};

const handleDragOver = (event: DragEvent) => {
  event.preventDefault();
  if (event.dataTransfer) {
    event.dataTransfer.dropEffect = 'move';
  }
};

const handleDrop = (event: DragEvent, dropIndex: number) => {
  event.preventDefault();
  const dragIndex = Number.parseInt(event.dataTransfer?.getData('text/plain') || '0', 10);
  if (dragIndex !== dropIndex) {
    moveFile(dragIndex, dropIndex);
  }
};

const handleDropZone = (event: DragEvent) => {
  event.preventDefault();
  if (event.dataTransfer?.files) {
    addFiles(Array.from(event.dataTransfer.files));
  }
};

// Функции для формы добавления
const closeAddForm = () => {
  showAddForm.value = false;
  formData.value = {
    name: '',
    mapName: '',
    side: '',
    difficulty: '',
    line: '',
    grenadeType: '',
    lineup_instructions: '',
  };
  // Очищаем превью URL перед удалением
  uploadedFiles.value.forEach((f) => {
    if (f.preview) {
      URL.revokeObjectURL(f.preview);
    }
  });
  uploadedFiles.value = [];
  addError.value = null;
  addSuccess.value = false;
  uploadError.value = null;
};

const handleAddGrenade = async () => {
  if (!formData.value.name || !formData.value.mapName || !formData.value.side ||
      !formData.value.difficulty || !formData.value.grenadeType || !formData.value.lineup_instructions) {
    addError.value = t('pages.grenades.addForm.error');
    return;
  }

  isSubmitting.value = true;
  addError.value = null;
  addSuccess.value = false;
  uploadError.value = null;

  try {
    let mediaFiles: Array<{ fileId: string; mediaType: 'photo' | 'video'; sortOrder: number }> = [];

    // Загружаем файлы, если они есть
    if (uploadedFiles.value.length > 0) {
      isUploading.value = true;
      const formDataToUpload = new FormData();
      uploadedFiles.value.forEach((f) => {
        formDataToUpload.append('files', f.file);
      });

      const uploadResponse = await $fetch<{ success: boolean; files: Array<{ fileId: string; mediaType: 'photo' | 'video' }> }>('/api/media/upload', {
        method: 'POST',
        body: formDataToUpload,
      });

      if (uploadResponse.success && uploadResponse.files) {
        // Используем порядок из uploadedFiles (уже отсортирован по sortOrder)
        mediaFiles = uploadedFiles.value
          .map((uploadedFile, index) => {
            const uploadedFileData = uploadResponse.files[index];
            if (!uploadedFileData) return null;
            return {
              fileId: uploadedFileData.fileId,
              mediaType: uploadedFileData.mediaType,
              sortOrder: uploadedFile.sortOrder,
            };
          })
          .filter((item): item is { fileId: string; mediaType: 'photo' | 'video'; sortOrder: number } => item !== null);
      }
      isUploading.value = false;
    }

    // Создаем гранату
    await $fetch('/api/grenades', {
      method: 'POST',
      body: {
        name: formData.value.name.trim(),
        mapName: formData.value.mapName,
        side: formData.value.side,
        difficulty: formData.value.difficulty,
        line: formData.value.line || null,
        grenadeType: formData.value.grenadeType,
        lineup_instructions: formData.value.lineup_instructions.trim(),
        mediaFiles: mediaFiles.length > 0 ? mediaFiles : undefined,
      },
    });

    addSuccess.value = true;
    await refresh();

    setTimeout(() => {
      closeAddForm();
    }, 1500);
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : t('pages.grenades.addForm.error');
    addError.value = errorMessage;
    isUploading.value = false;
  } finally {
    isSubmitting.value = false;
  }
};

const formatMap = (mapName: string) => getMapName(mapName) ?? mapName;
const formatSide = (side: string) => getSideName(side) ?? side;
const formatGrenade = (grenade: string) => getGrenadeTypeName(grenade) ?? grenade;
const formatDifficulty = (difficulty: string) => getDifficultyName(difficulty) ?? difficulty;
const formatLine = (line: string | null | undefined) => {
  if (!line) {
    return '—';
  }

  return getLineName(line) ?? line;
};
</script>

<template>
  <div class="bg-slate-950 text-slate-50">
    <header class="border-b border-slate-800 bg-slate-900/70 backdrop-blur">
      <div class="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <h1 class="text-xl font-semibold tracking-tight">{{ $t('pages.grenades.title') }}</h1>
        <div class="flex items-center gap-4">
          <button
            @click="showAddForm = true"
            class="rounded-md bg-sky-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-sky-700 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2 focus:ring-offset-slate-950"
          >
            + {{ $t('pages.grenades.add') }}
          </button>
          <NuxtLink to="/" class="text-sm text-slate-400 hover:text-slate-200">
            {{ $t('nav.home') }}
          </NuxtLink>
        </div>
      </div>
    </header>

    <main class="mx-auto max-w-6xl px-6 py-8">
      <!-- Форма добавления гранаты -->
      <section
        v-if="showAddForm"
        class="mb-6 rounded-lg border border-slate-800 bg-slate-900 p-6"
      >
        <div class="mb-4 flex items-center justify-between">
          <h2 class="text-lg font-semibold">{{ $t('pages.grenades.addForm.title') }}</h2>
          <button
            @click="closeAddForm"
            class="text-slate-400 hover:text-slate-200"
            type="button"
          >
            ✕
          </button>
        </div>

        <form @submit.prevent="handleAddGrenade" class="space-y-4">
          <div class="grid gap-4 md:grid-cols-2">
            <div>
              <label class="mb-2 block text-sm font-medium text-slate-300">
                {{ $t('pages.grenades.addForm.name') }} <span class="text-slate-500">*</span>
              </label>
              <input
                v-model="formData.name"
                type="text"
                required
                :placeholder="$t('pages.grenades.addForm.namePlaceholder')"
                class="w-full rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/40"
              />
            </div>

            <div>
              <label class="mb-2 block text-sm font-medium text-slate-300">
                {{ $t('pages.grenades.addForm.map') }} <span class="text-slate-500">*</span>
              </label>
              <select
                v-model="formData.mapName"
                required
                class="w-full rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/40"
              >
                <option value="">{{ $t('pages.grenades.addForm.map') }}</option>
                <option
                  v-for="map in maps"
                  :key="map.id"
                  :value="map.name"
                >
                  {{ map.display_name }}
                </option>
              </select>
            </div>

            <div>
              <label class="mb-2 block text-sm font-medium text-slate-300">
                {{ $t('pages.grenades.addForm.side') }} <span class="text-slate-500">*</span>
              </label>
              <select
                v-model="formData.side"
                required
                class="w-full rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/40"
              >
                <option value="">{{ $t('pages.grenades.addForm.side') }}</option>
                <option
                  v-for="side in sides"
                  :key="side.id"
                  :value="side.name"
                >
                  {{ side.display_name }}
                </option>
              </select>
            </div>

            <div>
              <label class="mb-2 block text-sm font-medium text-slate-300">
                {{ $t('pages.grenades.addForm.difficulty') }} <span class="text-slate-500">*</span>
              </label>
              <select
                v-model="formData.difficulty"
                required
                class="w-full rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/40"
              >
                <option value="">{{ $t('pages.grenades.addForm.difficulty') }}</option>
                <option
                  v-for="difficulty in difficulties"
                  :key="difficulty.id"
                  :value="difficulty.name"
                >
                  {{ difficulty.display_name }}
                </option>
              </select>
            </div>

            <div>
              <label class="mb-2 block text-sm font-medium text-slate-300">
                {{ $t('pages.grenades.addForm.lineOptional') }}
              </label>
              <select
                v-model="formData.line"
                class="w-full rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/40"
              >
                <option value="">{{ $t('pages.grenades.addForm.lineOptional') }}</option>
                <option
                  v-for="line in lines"
                  :key="line.id"
                  :value="line.name"
                >
                  {{ line.display_name }}
                </option>
              </select>
            </div>

            <div>
              <label class="mb-2 block text-sm font-medium text-slate-300">
                {{ $t('pages.grenades.addForm.grenadeType') }} <span class="text-slate-500">*</span>
              </label>
              <select
                v-model="formData.grenadeType"
                required
                class="w-full rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/40"
              >
                <option value="">{{ $t('pages.grenades.addForm.grenadeType') }}</option>
                <option
                  v-for="type in grenadeTypes"
                  :key="type.id"
                  :value="type.name"
                >
                  {{ type.display_name }}
                </option>
              </select>
            </div>
          </div>

          <div>
            <label class="mb-2 block text-sm font-medium text-slate-300">
              {{ $t('pages.grenades.addForm.instructions') }} <span class="text-slate-500">*</span>
            </label>
            <textarea
              v-model="formData.lineup_instructions"
              required
              rows="5"
              :placeholder="$t('pages.grenades.addForm.instructionsPlaceholder')"
              class="w-full rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/40"
            />
          </div>

          <!-- Загрузка файлов -->
          <div>
            <label class="mb-2 block text-sm font-medium text-slate-300">
              {{ $t('pages.grenades.addForm.images') }}
              <span class="text-slate-500">({{ $t('pages.grenades.addForm.maxFiles') }})</span>
            </label>

            <!-- Drop Zone -->
            <div
              @drop.prevent="handleDropZone"
              @dragover.prevent="handleDragOver"
              class="mb-4 rounded-lg border-2 border-dashed border-slate-700 bg-slate-800/50 p-6 text-center transition-colors hover:border-sky-500"
            >
              <input
                type="file"
                multiple
                accept="image/*,video/*"
                @change="handleFileSelect"
                class="hidden"
                id="file-upload"
                :disabled="uploadedFiles.length >= 10"
              />
              <label
                for="file-upload"
                class="cursor-pointer text-sm text-slate-400 hover:text-slate-200"
              >
                {{ $t('pages.grenades.addForm.dropFiles') }} или
                <span class="text-sky-400 underline">{{ $t('pages.grenades.addForm.selectFiles') }}</span>
              </label>
              <p class="mt-2 text-xs text-slate-500">
                {{ $t('pages.grenades.addForm.fileTypes') }}
              </p>
            </div>

            <!-- Список загруженных файлов с drag-and-drop -->
            <div v-if="uploadedFiles.length > 0" class="space-y-2">
              <div
                v-for="(uploadedFile, index) in uploadedFiles"
                :key="uploadedFile.id"
                draggable="true"
                @dragstart="handleDragStart($event, index)"
                @dragover.prevent="handleDragOver"
                @drop.prevent="handleDrop($event, index)"
                class="group flex items-center gap-3 rounded-lg border border-slate-700 bg-slate-800 p-3 transition-all hover:border-sky-500"
              >
                <div class="flex-shrink-0 cursor-move text-slate-400 group-hover:text-sky-400">
                  <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 8h16M4 16h16" />
                  </svg>
                </div>

                <div class="flex-1 flex items-center gap-3">
                  <div v-if="uploadedFile.mediaType === 'photo'" class="h-16 w-16 flex-shrink-0 overflow-hidden rounded border border-slate-700">
                    <img :src="uploadedFile.preview" :alt="uploadedFile.file.name" class="h-full w-full object-cover" />
                  </div>
                  <div v-else class="h-16 w-16 flex-shrink-0 flex items-center justify-center rounded border border-slate-700 bg-slate-900">
                    <svg class="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                  </div>

                  <div class="flex-1 min-w-0">
                    <p class="text-sm font-medium text-slate-200 truncate">{{ uploadedFile.file.name }}</p>
                    <p class="text-xs text-slate-400">
                      {{ uploadedFile.mediaType === 'photo' ? $t('pages.grenades.addForm.photo') : $t('pages.grenades.addForm.video') }}
                      <span v-if="index === 0" class="ml-2 text-sky-400">({{ $t('pages.grenades.addForm.coverImage') }})</span>
                    </p>
                  </div>

                  <button
                    @click="removeFile(uploadedFile.id)"
                    type="button"
                    class="flex-shrink-0 rounded p-1 text-slate-400 hover:bg-rose-900/50 hover:text-rose-400"
                  >
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>

            <div v-if="uploadError" class="mt-2 rounded-md border border-rose-900/50 bg-rose-900/20 px-3 py-2 text-xs text-rose-200">
              {{ uploadError }}
            </div>
          </div>

          <div
            v-if="addError"
            class="rounded-md border border-rose-900/50 bg-rose-900/20 px-4 py-3 text-sm text-rose-200"
          >
            {{ addError }}
          </div>

          <div
            v-if="addSuccess"
            class="rounded-md border border-green-900/50 bg-green-900/20 px-4 py-3 text-sm text-green-200"
          >
            {{ $t('pages.grenades.addForm.success') }}
          </div>

          <div class="flex items-center gap-3">
            <button
              type="submit"
              :disabled="isSubmitting"
              class="rounded-md bg-sky-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-sky-700 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2 focus:ring-offset-slate-900 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span v-if="isSubmitting">{{ $t('pages.grenades.addForm.submitting') }}</span>
              <span v-else>{{ $t('pages.grenades.addForm.submit') }}</span>
            </button>
            <button
              type="button"
              @click="closeAddForm"
              class="rounded-md border border-slate-700 bg-slate-800 px-4 py-2 text-sm font-medium text-slate-300 transition-colors hover:bg-slate-700"
            >
              {{ $t('pages.grenades.addForm.cancel') }}
            </button>
          </div>
        </form>
      </section>

      <section class="grid gap-6">
        <div class="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p class="text-sm text-slate-400">
              {{ $t('pages.grenades.description') }}
            </p>
          </div>

          <div class="flex items-center gap-3">
            <label class="text-sm text-slate-300" for="map-filter">{{ $t('pages.grenades.map') }}</label>
            <select
              id="map-filter"
              class="rounded-md border border-slate-800 bg-slate-900 px-3 py-2 text-sm text-slate-100 shadow-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/40"
              v-model="selectedMap"
            >
              <option value="all">{{ $t('pages.grenades.allMaps') }}</option>
              <option
                v-for="option in mapOptions"
                :key="option.value"
                :value="option.value"
              >
                {{ option.label }}
              </option>
            </select>
          </div>
        </div>

        <section
          v-if="pending"
          class="grid h-48 place-items-center rounded-lg border border-slate-800 bg-slate-900"
        >
          <span class="text-sm text-slate-400">{{ $t('pages.grenades.loading') }}</span>
        </section>

        <section
          v-else-if="errorMessage"
          class="rounded-lg border border-rose-900/50 bg-rose-900/20 px-4 py-3 text-rose-200"
        >
          {{ $t('pages.grenades.error') }}
        </section>

        <section
          v-else
          class="grid gap-4 md:grid-cols-2"
        >
          <article
            v-for="grenade in grenades"
            :key="grenade.id"
            class="flex flex-col gap-3 rounded-lg border border-slate-800 bg-slate-900 px-5 py-4 shadow-sm shadow-black/30"
          >
            <header class="flex items-center justify-between gap-3">
              <div>
                <h2 class="text-base font-semibold text-slate-100">
                  {{ grenade.name }}
                </h2>
                <p class="text-xs text-slate-400">
                  {{ formatMap(grenade.map_name) }} • {{ formatSide(grenade.side) }} •
                  {{ formatGrenade(grenade.grenade_type) }}
                </p>
              </div>
              <span class="rounded-full bg-slate-800 px-2 py-1 text-xs text-slate-300">
                {{ formatDifficulty(grenade.difficulty) }}
              </span>
            </header>

            <p class="text-sm whitespace-pre-line text-slate-300">
              {{ grenade.lineup_instructions }}
            </p>

            <footer class="mt-auto flex items-center justify-between text-xs text-slate-500">
              <span>
                {{ formatLine(grenade.line) }} • ID: {{ grenade.id }}
              </span>
              <NuxtLink
                class="text-sky-400 hover:text-sky-300"
                :to="`/grenades/${grenade.id}`"
              >
                {{ $t('pages.grenades.more') }}
              </NuxtLink>
            </footer>
          </article>

          <p v-if="!grenades.length" class="col-span-full rounded-lg border border-slate-800 bg-slate-900 px-4 py-5 text-center text-sm text-slate-400">
            {{ $t('pages.grenades.notFound') }}
          </p>
        </section>
      </section>
    </main>
  </div>
</template>

