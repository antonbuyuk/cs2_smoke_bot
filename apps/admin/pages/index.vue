<script setup lang="ts">
definePageMeta({
  layout: 'default',
});

const { data: smokesData, pending: smokesPending } = await useFetch('/api/smokes', {
  transform: (response: { data: unknown[] }) => response.data,
});

const { data: mapsData, pending: mapsPending } = await useFetch('/api/maps', {
  transform: (response: { data: unknown[] }) => response.data,
});

const smokesCount = computed(() => smokesData.value?.length ?? 0);
const mapsCount = computed(() => mapsData.value?.length ?? 0);
const isLoading = computed(() => smokesPending.value || mapsPending.value);
</script>

<template>
  <div class="min-h-screen bg-slate-950">
    <div class="mx-auto max-w-6xl px-6 py-8">
      <div class="mb-8">
        <h1 class="text-3xl font-bold text-slate-50 mb-2">Dashboard</h1>
        <p class="text-slate-400">Добро пожаловать в панель управления CS2 Bot</p>
      </div>

      <div v-if="isLoading" class="grid h-48 place-items-center rounded-lg border border-slate-800 bg-slate-900">
        <span class="text-sm text-slate-400">Загружаем данные…</span>
      </div>

      <div v-else class="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <NuxtLink
          to="/smokes"
          class="group rounded-lg border border-slate-800 bg-slate-900 p-6 hover:border-sky-500/50 hover:bg-slate-800/50 transition-all"
        >
          <div class="flex items-center justify-between mb-4">
            <h2 class="text-lg font-semibold text-slate-200 group-hover:text-sky-400 transition-colors">
              Smokes
            </h2>
            <svg
              class="w-5 h-5 text-slate-400 group-hover:text-sky-400 transition-colors"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
            </svg>
          </div>
          <p class="text-3xl font-bold text-slate-50 mb-2">{{ smokesCount }}</p>
          <p class="text-sm text-slate-400">Всего сохраненных смоков</p>
        </NuxtLink>

        <NuxtLink
          to="/settings/tables/maps"
          class="group rounded-lg border border-slate-800 bg-slate-900 p-6 hover:border-sky-500/50 hover:bg-slate-800/50 transition-all"
        >
          <div class="flex items-center justify-between mb-4">
            <h2 class="text-lg font-semibold text-slate-200 group-hover:text-sky-400 transition-colors">
              Maps
            </h2>
            <svg
              class="w-5 h-5 text-slate-400 group-hover:text-sky-400 transition-colors"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
            </svg>
          </div>
          <p class="text-3xl font-bold text-slate-50 mb-2">{{ mapsCount }}</p>
          <p class="text-sm text-slate-400">Карт в базе данных</p>
        </NuxtLink>

        <NuxtLink
          to="/settings/tables/maps"
          class="group rounded-lg border border-slate-800 bg-slate-900 p-6 hover:border-sky-500/50 hover:bg-slate-800/50 transition-all"
        >
          <div class="flex items-center justify-between mb-4">
            <h2 class="text-lg font-semibold text-slate-200 group-hover:text-sky-400 transition-colors">
              Settings
            </h2>
            <svg
              class="w-5 h-5 text-slate-400 group-hover:text-sky-400 transition-colors"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
            </svg>
          </div>
          <p class="text-sm text-slate-400">Управление справочными таблицами</p>
        </NuxtLink>
      </div>

      <div class="mt-8 rounded-lg border border-slate-800 bg-slate-900 p-6">
        <h2 class="text-lg font-semibold text-slate-200 mb-4">Быстрые ссылки</h2>
        <div class="grid gap-4 md:grid-cols-2">
          <NuxtLink
            to="/settings/tables/maps"
            class="flex items-center gap-3 rounded-md border border-slate-800 bg-slate-800/50 p-4 hover:border-sky-500/50 transition-colors"
          >
            <span class="text-slate-300">Maps</span>
          </NuxtLink>
          <NuxtLink
            to="/settings/tables/sides"
            class="flex items-center gap-3 rounded-md border border-slate-800 bg-slate-800/50 p-4 hover:border-sky-500/50 transition-colors"
          >
            <span class="text-slate-300">Sides</span>
          </NuxtLink>
          <NuxtLink
            to="/settings/tables/difficulties"
            class="flex items-center gap-3 rounded-md border border-slate-800 bg-slate-800/50 p-4 hover:border-sky-500/50 transition-colors"
          >
            <span class="text-slate-300">Difficulties</span>
          </NuxtLink>
          <NuxtLink
            to="/settings/tables/lines"
            class="flex items-center gap-3 rounded-md border border-slate-800 bg-slate-800/50 p-4 hover:border-sky-500/50 transition-colors"
          >
            <span class="text-slate-300">Lines</span>
          </NuxtLink>
          <NuxtLink
            to="/settings/tables/grenade-types"
            class="flex items-center gap-3 rounded-md border border-slate-800 bg-slate-800/50 p-4 hover:border-sky-500/50 transition-colors"
          >
            <span class="text-slate-300">Grenade Types</span>
          </NuxtLink>
        </div>
      </div>
    </div>
  </div>
</template>
