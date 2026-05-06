
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
const { isAuthenticated } = useAuth();

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

const isDragOver = ref(false);
</script>

<template>
  <main class="page">
    <div class="page-head">
      <h1>Lineups</h1>
      <button v-if="isAuthenticated" class="btn-primary" @click="showAddForm = true">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>
        Add Lineup
      </button>
    </div>

    <!-- Filter row -->
    <div class="filter-row">
      <label>Map</label>
      <select v-model="selectedMap">
        <option value="all">All maps</option>
        <option v-for="option in mapOptions" :key="option.value" :value="option.value">
          {{ option.label }}
        </option>
      </select>
    </div>

    <StateBox v-if="pending" type="loading" title="Loading lineups..." />
    <StateBox v-else-if="errorMessage" type="error" title="Failed to load lineups" :description="errorMessage" />
    <StateBox v-else-if="grenades.length === 0" type="empty" title="No lineups found" description="Try a different map filter or add a new lineup." />

    <!-- Grid -->
    <div v-else class="lineup-grid">
      <article v-for="g in grenades" :key="g.id" class="l-card">
        <div class="l-card-head">
          <h3>{{ g.name }}</h3>
          <GrenadeTypeBadge :type-name="g.grenade_type" :display-name="formatGrenade(g.grenade_type)" variant="simple" />
        </div>
        <div class="l-card-badges">
          <span class="badge">{{ formatSide(g.side) }}-side</span>
          <span v-if="g.line" class="badge">{{ formatLine(g.line) }}</span>
          <span class="badge">{{ formatDifficulty(g.difficulty) }}</span>
        </div>
        <div class="l-card-meta">
          <span>{{ g.map_display_name }}</span>
        </div>
        <p class="l-card-desc">{{ g.lineup_instructions }}</p>
        <div class="l-card-foot">
          <NuxtLink class="more-link" :to="`/grenades/${g.id}`">
            More
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>
          </NuxtLink>
        </div>
      </article>
    </div>
  </main>

  <AppModal v-model="showAddForm" title="Add new lineup" modal-class="modal-md" @closed="closeAddForm">
    <form @submit.prevent="handleAddGrenade">
          <div class="form-grid">
            <div class="field">
              <label>{{ t('pages.grenades.addForm.name') }} <span class="req">*</span></label>
              <input v-model="formData.name" type="text" :placeholder="t('pages.grenades.addForm.namePlaceholder')" />
            </div>
            <div class="field">
              <label>{{ t('pages.grenades.addForm.map') }}</label>
              <select v-model="formData.mapName" class="form-select">
                <option value="">— {{ t('pages.grenades.addForm.map') }} —</option>
                <option v-for="map in maps" :key="map.id" :value="map.name">{{ map.display_name }}</option>
              </select>
            </div>
            <div class="field">
              <label>{{ t('pages.grenades.addForm.side') }}</label>
              <select v-model="formData.side" class="form-select">
                <option value="">— {{ t('pages.grenades.addForm.side') }} —</option>
                <option v-for="s in sides" :key="s.id" :value="s.name">{{ s.display_name }}</option>
              </select>
            </div>
            <div class="field">
              <label>{{ t('pages.grenades.addForm.difficulty') }}</label>
              <select v-model="formData.difficulty" class="form-select">
                <option value="">— {{ t('pages.grenades.addForm.difficulty') }} —</option>
                <option v-for="d in difficulties" :key="d.id" :value="d.name">{{ d.display_name }}</option>
              </select>
            </div>
            <div class="field">
              <label>{{ t('pages.grenades.addForm.lineOptional') }}</label>
              <select v-model="formData.line" class="form-select">
                <option value="">— none —</option>
                <option v-for="l in lines" :key="l.id" :value="l.name">{{ l.display_name }}</option>
              </select>
            </div>
            <div class="field">
              <label>{{ t('pages.grenades.addForm.grenadeType') }}</label>
              <select v-model="formData.grenadeType" class="form-select">
                <option value="">— {{ t('pages.grenades.addForm.grenadeType') }} —</option>
                <option v-for="type in grenadeTypes" :key="type.id" :value="type.name">{{ type.display_name }}</option>
              </select>
            </div>
            <div class="field full">
              <label>{{ t('pages.grenades.addForm.instructions') }} <span class="req">*</span></label>
              <textarea v-model="formData.lineup_instructions" :placeholder="t('pages.grenades.addForm.instructionsPlaceholder')" />
            </div>
          </div>

          <!-- Dropzone -->
          <div
            :class="['dropzone', { dragover: isDragOver }]"
            @click="($refs.fileInput as HTMLInputElement)?.click()"
            @drop.prevent="handleDropZone"
            @dragover.prevent="isDragOver = true"
            @dragleave="isDragOver = false"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
            <p>{{ t('pages.grenades.addForm.dropFiles') }}</p>
            <span class="hint">Max 10 files · Images and video</span>
            <input
              ref="fileInput"
              type="file"
              accept="image/*,video/*"
              multiple
              hidden
              :disabled="uploadedFiles.length >= 10"
              @change="handleFileSelect"
            />
          </div>

          <!-- File list -->
          <div v-if="uploadedFiles.length > 0" class="file-list">
            <div
              v-for="(f, i) in uploadedFiles"
              :key="f.id"
              class="file-item"
              draggable="true"
              @dragstart="handleDragStart($event, i)"
              @dragover.prevent="handleDragOver"
              @drop.prevent="handleDrop($event, i)"
            >
              <span class="drag-handle" style="display:flex;gap:2px;flex-direction:column">
                <button type="button" @click="moveFile(i, i - 1)" style="background:none;border:none;color:var(--text-4);cursor:pointer;padding:0;line-height:1;font-size:10px">▲</button>
                <button type="button" @click="moveFile(i, i + 1)" style="background:none;border:none;color:var(--text-4);cursor:pointer;padding:0;line-height:1;font-size:10px">▼</button>
              </span>
              <span class="file-name">{{ f.file.name }}</span>
              <span class="file-size">{{ (f.file.size / 1024).toFixed(0) }} KB</span>
              <span v-if="i === 0" class="cover-badge">Cover</span>
              <button type="button" class="file-remove" @click="removeFile(f.id)">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>
              </button>
            </div>
          </div>

          <!-- Upload error -->
          <div v-if="uploadError" class="msg msg-error">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/></svg>
            {{ uploadError }}
          </div>

          <!-- Add error -->
          <div v-if="addError" class="msg msg-error">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/></svg>
            {{ addError }}
          </div>

          <!-- Success -->
          <div v-if="addSuccess" class="msg msg-success">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
            {{ t('pages.grenades.addForm.success') }}
          </div>

          <div class="form-foot">
            <button type="button" class="btn-ghost" @click="closeAddForm">{{ t('pages.grenades.addForm.cancel') }}</button>
            <button type="submit" class="btn-primary" :disabled="isSubmitting">
              <span v-if="isSubmitting || isUploading">{{ t('pages.grenades.addForm.submitting') }}</span>
              <span v-else>{{ t('pages.grenades.addForm.submit') }}</span>
            </button>
          </div>
    </form>
  </AppModal>
</template>

<style lang="scss" scoped>
@use '~/assets/styles/mixins' as *;


.filter-row {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 20px;
  flex-wrap: wrap;

  label {
    font-family: 'JetBrains Mono', monospace;
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: .08em;
    color: var(--text-3);
  }
}

select {
  height: 36px;
  padding: 0 32px 0 12px;
  background: var(--bg-2);
  border: 1px solid var(--line);
  color: var(--text-1);
  border-radius: 8px;
  font-size: 13px;
  appearance: none;
  // stylelint-disable-next-line function-url-quotes
  background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23a4abbb' stroke-width='2.5'><polyline points='6 9 12 15 18 9'/></svg>");
  background-repeat: no-repeat;
  background-position: right 10px center;
  cursor: pointer;

  &:focus { outline: none; border-color: var(--accent); box-shadow: 0 0 0 3px var(--accent-soft); }
}

.lineup-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
  gap: 16px;

  @include respond-to(720) { grid-template-columns: 1fr; }
}

.l-card {
  background: var(--bg-1);
  border: 1px solid var(--line);
  border-radius: var(--radius);
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  transition: border-color .15s, box-shadow .15s, transform .15s;

  &:hover { border-color: var(--line-strong); transform: translateY(-2px); box-shadow: 0 8px 24px rgba(0,0,0,.4); }

  &-head {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 10px;

    h3 { font-size: 17px; font-weight: 600; letter-spacing: -0.005em; margin: 0; }
  }

  &-badges { display: flex; gap: 6px; flex-wrap: wrap; }

  &-meta {
    display: flex;
    flex-wrap: wrap;
    gap: 6px 16px;
    font-family: 'JetBrains Mono', monospace;
    font-size: 12px;
    color: var(--text-3);

    span { display: inline-flex; align-items: center; gap: 5px; }
  }

  &-desc {
    font-size: 14px;
    color: var(--text-2);
    line-height: 1.55;
    display: -webkit-box;
    -webkit-line-clamp: 3;
    -webkit-box-orient: vertical;
    overflow: hidden;
    margin: 0;
  }

  &-foot {
    margin-top: auto;
    padding-top: 10px;
    border-top: 1px dashed var(--line);
    display: flex;
    justify-content: flex-end;
  }
}

.more-link {
  font-family: 'JetBrains Mono', monospace;
  font-size: 12px;
  color: var(--accent);
  display: inline-flex;
  align-items: center;
  gap: 6px;
  text-decoration: none;

  &:hover { text-decoration: underline; }
  svg { width: 14px; height: 14px; }
}

.form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14px;

  @include respond-to(520) { grid-template-columns: 1fr; }

  .field.full { grid-column: 1 / -1; }
}

.dropzone {
  border: 2px dashed var(--line-strong);
  border-radius: var(--radius);
  padding: 32px 20px;
  text-align: center;
  cursor: pointer;
  transition: border-color .15s, background .15s;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  color: var(--text-3);

  &:hover, &.dragover { border-color: var(--accent); background: var(--accent-soft); }
  svg { width: 28px; height: 28px; color: var(--text-3); }
  p { font-size: 13px; margin: 0; }
  .hint { font-size: 11px; color: var(--text-4); }
}

.file-list { display: flex; flex-direction: column; gap: 8px; }

.file-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 14px;
  background: var(--bg-2);
  border: 1px solid var(--line);
  border-radius: var(--radius-sm);
  font-size: 13px;

  .drag-handle { cursor: grab; color: var(--text-4); display: flex; align-items: center; }
  .file-name { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: var(--text-1); }
  .file-size { font-family: 'JetBrains Mono', monospace; font-size: 11px; color: var(--text-3); }

  .cover-badge {
    font-family: 'JetBrains Mono', monospace;
    font-size: 10px;
    text-transform: uppercase;
    letter-spacing: .08em;
    color: var(--accent);
    background: var(--accent-soft);
    padding: 2px 8px;
    border-radius: 4px;
    border: 1px solid var(--accent);
  }

  .file-remove {
    width: 28px;
    height: 28px;
    border-radius: 6px;
    background: transparent;
    border: 1px solid var(--line);
    color: var(--text-3);
    display: grid;
    place-items: center;
    cursor: pointer;
    transition: all .15s;
    flex-shrink: 0;

    &:hover { color: var(--red); border-color: var(--red); background: var(--red-soft); }
    svg { width: 12px; height: 12px; }
  }
}
</style>
