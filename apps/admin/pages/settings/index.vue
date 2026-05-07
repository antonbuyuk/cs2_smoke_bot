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
  },
  {
    name: t('pages.settings.tables.sides.name'),
    description: t('pages.settings.tables.sides.description'),
    path: '/settings/tables/sides',
    count: sidesCount,
  },
  {
    name: t('pages.settings.tables.difficulties.name'),
    description: t('pages.settings.tables.difficulties.description'),
    path: '/settings/tables/difficulties',
    count: difficultiesCount,
  },
  {
    name: t('pages.settings.tables.lines.name'),
    description: t('pages.settings.tables.lines.description'),
    path: '/settings/tables/lines',
    count: linesCount,
  },
  {
    name: t('pages.settings.tables.grenadeTypes.name'),
    description: t('pages.settings.tables.grenadeTypes.description'),
    path: '/settings/tables/grenade-types',
    count: grenadeTypesCount,
  },
]);
</script>

<template>
  <main class="page">
    <NuxtLink class="back-link" to="/">← Home</NuxtLink>

    <div class="page-head">
      <h1>{{ t('pages.settings.title') }}</h1>
      <p>{{ t('pages.settings.subtitle') }}</p>
    </div>

    <!-- Loading skeleton -->
    <div v-if="pending" class="cards-grid">
      <div v-for="i in 5" :key="i" class="skeleton sk-card" />
    </div>

    <!-- Cards -->
    <div v-else class="cards-grid">
      <NuxtLink v-for="table in referenceTables" :key="table.path" :to="table.path" class="s-card">
        <div class="s-card-body">
          <h3>
            {{ table.name }}
            <span class="count">{{ table.count }}</span>
          </h3>
          <span class="desc">{{ table.description }}</span>
        </div>
        <span class="s-card-arrow">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"
            stroke-linejoin="round">
            <path d="M5 12h14M13 6l6 6-6 6" />
          </svg>
        </span>
      </NuxtLink>
    </div>

    <!-- Info box -->
    <div class="info-box">
      <div class="info-icon">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"
          stroke-linejoin="round">
          <circle cx="12" cy="12" r="10" />
          <path d="M12 16v-4M12 8h.01" />
        </svg>
      </div>
      <div class="info-text">
        <h4>{{ t('pages.settings.info.title') }}</h4>
        <p>{{ t('pages.settings.info.description') }}</p>
      </div>
    </div>
  </main>
</template>

<style lang="scss" scoped>
.page-head {
  margin-bottom: 28px;

  p { color: var(--text-2); font-size: 14px; margin: 0; }
}

.cards-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 14px;
  margin-bottom: 32px;
}

.s-card {
  background: var(--bg-1);
  border: 1px solid var(--line);
  border-radius: var(--radius);
  padding: 22px;
  display: flex;
  align-items: flex-start;
  gap: 16px;
  cursor: pointer;
  transition: border-color .15s, transform .15s, box-shadow .15s;
  text-decoration: none;
  color: inherit;

  &:hover {
    border-color: var(--line-strong);
    transform: translateY(-2px);
    box-shadow: 0 8px 24px rgba(0,0,0,.4);
    text-decoration: none;

    .s-card-arrow { color: var(--accent); transform: translateX(3px); }
  }

  &-icon {
    width: 44px;
    height: 44px;
    border-radius: 12px;
    background: var(--bg-2);
    border: 1px solid var(--line);
    display: grid;
    place-items: center;
    font-size: 20px;
    flex-shrink: 0;
  }

  &-body {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 6px;

    h3 { font-size: 16px; font-weight: 600; display: flex; align-items: center; gap: 8px; margin: 0; }

    .count {
      font-family: 'JetBrains Mono', monospace;
      font-size: 11px;
      color: var(--accent);
      background: var(--accent-soft);
      padding: 2px 8px;
      border-radius: 4px;
      border: 1px solid color-mix(in oklab, var(--accent) 30%, transparent);
    }

    .desc { font-size: 13px; color: var(--text-3); line-height: 1.45; }
  }

  &-arrow {
    color: var(--text-4);
    flex-shrink: 0;
    align-self: center;
    transition: color .15s, transform .15s;
    svg { width: 18px; height: 18px; }
  }
}

.info-box {
  background: var(--bg-1);
  border: 1px solid var(--line);
  border-radius: var(--radius);
  padding: 20px 24px;
  display: flex;
  gap: 14px;
  align-items: flex-start;

  .info-icon {
    width: 36px;
    height: 36px;
    border-radius: 10px;
    background: var(--accent-soft);
    border: 1px solid color-mix(in oklab, var(--accent) 25%, transparent);
    display: grid;
    place-items: center;
    flex-shrink: 0;
    color: var(--accent);
    svg { width: 18px; height: 18px; }
  }

  .info-text {
    h4 { font-size: 14px; font-weight: 600; margin: 0 0 4px; }
    p  { font-size: 13px; color: var(--text-2); line-height: 1.5; margin: 0; }
  }
}

@keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }

.skeleton {
  background: linear-gradient(90deg, var(--bg-2) 25%, var(--bg-3) 50%, var(--bg-2) 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s ease-in-out infinite;
  border-radius: var(--radius);
}

.sk-card { height: 110px; }
</style>
