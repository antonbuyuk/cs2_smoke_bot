<script setup lang="ts">
definePageMeta({
  layout: 'default',
});

// Загружаем количество записей во всех справочных таблицах одним запросом
const { data: countsData, pending } = await useFetch('/api/settings/counts', {
  transform: (response: { data: { maps: number; sides: number; difficulties: number; lines: number; grenadeTypes: number } }) => response.data,
});

const mapsCount = computed(() => countsData.value?.maps ?? 0);
const sidesCount = computed(() => countsData.value?.sides ?? 0);
const difficultiesCount = computed(() => countsData.value?.difficulties ?? 0);
const linesCount = computed(() => countsData.value?.lines ?? 0);
const grenadeTypesCount = computed(() => countsData.value?.grenadeTypes ?? 0);

const { t } = useI18n();

const referenceTables = computed(() => [
  {
    name: t('pages.settings.tables.maps.name'),
    description: t('pages.settings.tables.maps.description'),
    path: '/settings/tables/maps',
    count: mapsCount,
    icon: '🗺️',
  },
  {
    name: t('pages.settings.tables.sides.name'),
    description: t('pages.settings.tables.sides.description'),
    path: '/settings/tables/sides',
    count: sidesCount,
    icon: '⚔️',
  },
  {
    name: t('pages.settings.tables.difficulties.name'),
    description: t('pages.settings.tables.difficulties.description'),
    path: '/settings/tables/difficulties',
    count: difficultiesCount,
    icon: '📊',
  },
  {
    name: t('pages.settings.tables.lines.name'),
    description: t('pages.settings.tables.lines.description'),
    path: '/settings/tables/lines',
    count: linesCount,
    icon: '📍',
  },
  {
    name: t('pages.settings.tables.grenadeTypes.name'),
    description: t('pages.settings.tables.grenadeTypes.description'),
    path: '/settings/tables/grenade-types',
    count: grenadeTypesCount,
    icon: '💣',
  },
]);
</script>

<template>
  <div class="bg-slate-950 text-slate-50">
    <header class="border-b border-slate-800 bg-slate-900/70 backdrop-blur">
      <div class="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <div>
          <h1 class="text-xl font-semibold tracking-tight">{{ t('pages.settings.title') }}</h1>
          <p class="mt-1 text-sm text-slate-400">{{ t('pages.settings.subtitle') }}</p>
        </div>
        <NuxtLink to="/" class="text-sm text-slate-400 hover:text-slate-200 transition-colors">
          {{ t('pages.settings.backToHome') }}
        </NuxtLink>
      </div>
    </header>

    <main class="mx-auto max-w-6xl px-6 py-8">
      <div v-if="pending" class="grid h-48 place-items-center rounded-lg border border-slate-800 bg-slate-900">
        <span class="text-sm text-slate-400">{{ t('pages.settings.loading') }}</span>
      </div>

      <div v-else class="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <NuxtLink
          v-for="table in referenceTables"
          :key="table.path"
          :to="table.path"
          class="group rounded-lg border border-slate-800 bg-slate-900 p-6 hover:border-sky-500/50 hover:bg-slate-800/50 transition-all"
        >
          <div class="flex items-start justify-between mb-4">
            <div class="flex items-center gap-3">
              <span class="text-2xl">{{ table.icon }}</span>
              <h2 class="text-lg font-semibold text-slate-200 group-hover:text-sky-400 transition-colors">
                {{ table.name }}
              </h2>
            </div>
            <svg
              class="w-5 h-5 text-slate-400 group-hover:text-sky-400 transition-colors flex-shrink-0"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
            </svg>
          </div>
          <p class="text-3xl font-bold text-slate-50 mb-2">{{ table.count }}</p>
          <p class="text-sm text-slate-400">{{ table.description }}</p>
        </NuxtLink>
      </div>

      <div class="mt-8 rounded-lg border border-slate-800 bg-slate-900 p-6">
        <h2 class="text-lg font-semibold text-slate-200 mb-4">{{ t('pages.settings.info.title') }}</h2>
        <div class="space-y-2 text-sm text-slate-400">
          <p>
            {{ t('pages.settings.info.description') }}
          </p>
          <p>
            <span class="text-slate-300 font-medium">{{ t('pages.settings.info.important') }}</span> {{ t('pages.settings.info.warning') }}
          </p>
        </div>
      </div>
    </main>
  </div>
</template>

