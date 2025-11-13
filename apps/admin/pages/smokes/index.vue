
<script setup lang="ts">
import { computed, ref, watch } from 'vue';

import {
  MAP_TYPES,
  getMapName,
  getSideName,
  getGrenadeTypeName,
  getDifficultyName,
  getLineName,
} from '@shared/config/constants';
import type { SmokeWithMap } from '@shared/utils/types';

const selectedMap = ref<'all' | string>('all');

const mapOptions = computed(() => {
  return Object.entries(MAP_TYPES)
    .filter(([key]) => key !== 'all')
    .map(([value, option]) => ({
      value,
      label: option.name,
    }));
});

const queryParams = computed(() => {
  if (selectedMap.value === 'all') {
    return {};
  }

  return { map: selectedMap.value };
});

const { data, pending, error, refresh } = await useFetch('/api/smokes', {
  query: queryParams,
  transform: (response: { data: SmokeWithMap[] }) => response.data,
});

watch(selectedMap, () => {
  refresh();
});

const smokes = computed(() => data.value ?? []);
const errorMessage = computed(() => {
  if (!error.value) {
    return '';
  }

  return 'Не удалось загрузить список смоков. Попробуйте обновить страницу.';
});

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
        <h1 class="text-xl font-semibold tracking-tight">Smokes</h1>
        <NuxtLink to="/" class="text-sm text-slate-400 hover:text-slate-200">
          Dashboard
        </NuxtLink>
      </div>
    </header>

    <main class="mx-auto max-w-6xl px-6 py-8">
      <section class="grid gap-6">
        <div class="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p class="text-sm text-slate-400">
              Просмотри хранящиеся смоки и фильтруй по карте.
            </p>
          </div>

          <div class="flex items-center gap-3">
            <label class="text-sm text-slate-300" for="map-filter">Карта</label>
            <select
              id="map-filter"
              class="rounded-md border border-slate-800 bg-slate-900 px-3 py-2 text-sm text-slate-100 shadow-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/40"
              v-model="selectedMap"
            >
              <option value="all">All maps</option>
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
          <span class="text-sm text-slate-400">Загружаем данные…</span>
        </section>

        <section
          v-else-if="errorMessage"
          class="rounded-lg border border-rose-900/50 bg-rose-900/20 px-4 py-3 text-rose-200"
        >
          {{ errorMessage }}
        </section>

        <section
          v-else
          class="grid gap-4 md:grid-cols-2"
        >
          <article
            v-for="smoke in smokes"
            :key="smoke.id"
            class="flex flex-col gap-3 rounded-lg border border-slate-800 bg-slate-900 px-5 py-4 shadow-sm shadow-black/30"
          >
            <header class="flex items-center justify-between gap-3">
              <div>
                <h2 class="text-base font-semibold text-slate-100">
                  {{ smoke.name }}
                </h2>
                <p class="text-xs text-slate-400">
                  {{ formatMap(smoke.map_name) }} • {{ formatSide(smoke.side) }} •
                  {{ formatGrenade(smoke.grenade_type) }}
                </p>
              </div>
              <span class="rounded-full bg-slate-800 px-2 py-1 text-xs text-slate-300">
                {{ formatDifficulty(smoke.difficulty) }}
              </span>
            </header>

            <p class="text-sm whitespace-pre-line text-slate-300">
              {{ smoke.lineup_instructions }}
            </p>

            <footer class="mt-auto flex items-center justify-between text-xs text-slate-500">
              <span>
                {{ formatLine(smoke.line) }} • ID: {{ smoke.id }}
              </span>
              <NuxtLink
                class="text-sky-400 hover:text-sky-300"
                :to="`/smokes/${smoke.id}`"
              >
                Подробнее
              </NuxtLink>
            </footer>
          </article>

          <p v-if="!smokes.length" class="col-span-full rounded-lg border border-slate-800 bg-slate-900 px-4 py-5 text-center text-sm text-slate-400">
            Смоки не найдены для выбранных параметров.
          </p>
        </section>
      </section>
    </main>
  </div>
</template>
