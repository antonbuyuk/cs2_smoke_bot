<script setup lang="ts">
import type { SmokeWithMap, SmokeMediaRecord } from '@shared/utils/types';

definePageMeta({
  layout: false,
});

// --- Theme ---
const { theme, toggleTheme } = useTheme();

// --- Auth ---
const { user, logout, isAuthenticated } = useAuth();
const userInitials = computed(() => {
  if (!user.value) return '?';
  const f = user.value.firstName?.[0] ?? '';
  const l = user.value.lastName?.[0] ?? '';
  return ((f + l).toUpperCase() || user.value.username?.[0]?.toUpperCase()) ?? '?';
});

// --- Flashcard progress ---
const { t } = useI18n();
const { fetchProgress, statusOf } = useProgress();
await fetchProgress();

// --- Data ---
const { data: grenadesResp, refresh: refreshGrenades } = await useFetch<{ data: SmokeWithMap[] }>('/api/grenades');
const { data: mapsResp } = await useFetch<{ data: Array<{ id: number; name: string; display_name: string; position_image_url: string | null }> }>('/api/maps');
const { data: typesResp } = await useFetch<{ data: Array<{ id: number; name: string; display_name: string }> }>('/api/grenade-types');

const allGrenades = computed(() => grenadesResp.value?.data ?? []);
const allMaps = computed(() => mapsResp.value?.data ?? []);
const allTypes = computed(() => typesResp.value?.data ?? []);

// --- Filters ---
const search = ref('');
const activeMapId = ref<number | null>(null);
const activeTypeNames = ref<string[]>([]);
const side = ref<'any' | 'T' | 'CT'>('any');
const sort = ref('recent');
const view = ref<'grid' | 'list'>('grid');
const openGrenade = ref<SmokeWithMap | null>(null);

// --- Map preview modal ---
const mapPreview = ref<{ url: string; name: string } | null>(null);
const openMapPreview = (m: { display_name: string; position_image_url: string | null }) => {
  if (!m.position_image_url) return;
  mapPreview.value = {
    url: `/api/media/${encodeURIComponent(m.position_image_url)}`,
    name: m.display_name,
  };
};

// --- Modal media ---
const modalMedia = ref<SmokeMediaRecord[]>([]);
const modalMediaLoading = ref(false);

watch(openGrenade, async (g) => {
  modalMedia.value = [];
  if (!g) return;
  modalMediaLoading.value = true;
  try {
    const resp = await $fetch<{ smoke: SmokeWithMap; media: SmokeMediaRecord[] }>(`/api/grenades/${g.id}`);
    modalMedia.value = resp.media ?? [];
  } finally {
    modalMediaLoading.value = false;
  }
});

// --- Maps with counts ---
const mapsWithCounts = computed(() => {
  const counts: Record<number, number> = {};
  allGrenades.value.forEach((g) => {
    if (g.map_id) counts[g.map_id] = (counts[g.map_id] || 0) + 1;
  });
  return allMaps.value.map((m) => ({ ...m, count: counts[m.id] ?? 0 }));
});

const totalLineupCount = computed(() => allGrenades.value.length);
const uniqueMapsCount = computed(() => new Set(allGrenades.value.map((g) => g.map_id).filter(Boolean)).size);

const learningGrenades = computed(() => allGrenades.value.filter((g) => statusOf(g.id) === 'learning'));

const mapsWithImage = computed(() => allMaps.value.filter((m) => !!m.position_image_url));

// --- Type color mapping ---
const { getTypeColorVar } = useGrenadeTypeColor();

function getTypeDisplayName(key: string): string {
  const found = allTypes.value.find(
    (t) => t.name === key || t.name.toLowerCase() === key.toLowerCase(),
  );
  return found?.display_name ?? key;
}

// --- Filtered & sorted grenades ---
const filtered = computed(() => {
  let arr = [...allGrenades.value];
  if (activeMapId.value) arr = arr.filter((g) => g.map_id === activeMapId.value);
  if (activeTypeNames.value.length) arr = arr.filter((g) => activeTypeNames.value.includes(g.grenade_type));
  if (side.value !== 'any') arr = arr.filter((g) => g.side === side.value || g.side === 'both');
  if (search.value.trim()) {
    const q = search.value.toLowerCase();
    arr = arr.filter(
      (g) =>
        g.name?.toLowerCase().includes(q) ||
        g.lineup_instructions?.toLowerCase().includes(q) ||
        g.map_display_name?.toLowerCase().includes(q),
    );
  }
  if (sort.value === 'alpha') arr.sort((a, b) => a.name.localeCompare(b.name));
  return arr;
});

const hasFilters = computed(
  () => !!activeMapId.value || activeTypeNames.value.length > 0 || side.value !== 'any',
);
const activeMapObj = computed(() => allMaps.value.find((m) => m.id === activeMapId.value));

const toggleType = (name: string) => {
  const idx = activeTypeNames.value.indexOf(name);
  if (idx === -1) activeTypeNames.value.push(name);
  else activeTypeNames.value.splice(idx, 1);
};

const clearAll = () => {
  activeMapId.value = null;
  activeTypeNames.value = [];
  side.value = 'any';
  search.value = '';
};

// --- Actions ---
const handleCreate = () => navigateTo('/grenades');
const handleEdit = (g: SmokeWithMap) => navigateTo(`/grenades/${g.id}`);
const handleDelete = async (g: SmokeWithMap) => {
  if (!confirm(`Delete "${g.name}"?`)) return;
  try {
    await $fetch(`/api/grenades/${g.id}`, { method: 'DELETE' });
    openGrenade.value = null;
    await refreshGrenades();
  } catch {
    navigateTo(`/grenades/${g.id}`);
  }
};

// --- Stat sparkline data ---
const sparkValues = [40, 55, 38, 72, 60, 84, 90];
</script>

<template>
  <div class="nd-app">
    <!-- ── HEADER ─────────────────────────────────────────── -->
    <header class="nd-header">
      <div class="nd-header-inner">
        <NuxtLink to="/" class="nd-brand">
          <span class="nd-brand-mark">N</span>
          <span class="nd-brand-name">nade<span>.</span>map</span>
        </NuxtLink>

        <div class="nd-search">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>
          <input
            v-model="search"
            placeholder="Search lineups, maps, types..."
          />
          <span class="nd-kbd">⌘K</span>
        </div>

        <div class="nd-spacer" />

        <div class="nd-header-actions">
          <NuxtLink to="/settings" class="nd-btn-ghost">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14M4.93 4.93a10 10 0 0 0 0 14.14"/></svg>
            <span>Settings</span>
          </NuxtLink>
          <button class="nd-icon-btn" :title="theme === 'dark' ? 'Light mode' : 'Dark mode'" @click="toggleTheme">
            <svg v-if="theme === 'dark'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/></svg>
            <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
          </button>
          <button class="nd-btn-primary" @click="handleCreate">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>
            <span class="nd-label">New lineup</span>
          </button>
          <div class="nd-avatar" :title="user?.firstName">
            {{ userInitials }}
          </div>
        </div>
      </div>
    </header>

    <!-- Mobile search -->
    <div class="nd-mobile-search">
      <div class="nd-mobile-search-inner">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>
        <input v-model="search" placeholder="Search lineups..." />
      </div>
    </div>

    <!-- ── PAGE ──────────────────────────────────────────── -->
    <main class="nd-page">

      <!-- Hero stats -->
      <div class="nd-hero">
        <div class="nd-hero-headline">
          <h1>Your lineup library</h1>
          <p>Filter by map, type, side — recall every throw in seconds.</p>
        </div>
        <div class="nd-hero-stats">
          <div class="nd-stat">
            <div class="nd-stat-label">Lineups</div>
            <div class="nd-stat-value">{{ totalLineupCount }}</div>
            <div class="nd-stat-spark">
              <span v-for="v in sparkValues" :key="v" :style="{ height: v + '%' }" />
            </div>
          </div>
          <div class="nd-stat">
            <div class="nd-stat-label">Maps</div>
            <div class="nd-stat-value">{{ uniqueMapsCount }}</div>
            <div class="nd-stat-spark">
              <span v-for="v in [20,40,55,60,55,80,75]" :key="v" :style="{ height: v + '%' }" />
            </div>
          </div>
          <div class="nd-stat">
            <div class="nd-stat-label">Types</div>
            <div class="nd-stat-value">{{ allTypes.length }}</div>
            <div class="nd-stat-spark">
              <span v-for="v in [10,30,45,55,70,72,88]" :key="v" :style="{ height: v + '%' }" />
            </div>
          </div>
          <div class="nd-stat">
            <div class="nd-stat-label">Showing</div>
            <div class="nd-stat-value">{{ filtered.length }}</div>
            <div class="nd-stat-spark">
              <span v-for="v in [60,55,72,40,55,78,52]" :key="v" :style="{ height: v + '%' }" />
            </div>
          </div>
        </div>
      </div>

      <!-- In-progress deck -->
      <section v-if="isAuthenticated && learningGrenades.length" class="nd-deck">
        <div class="nd-deck-head">
          <h2>{{ t('flashcard.inProgressTitle') }}</h2>
          <span class="nd-deck-count">{{ learningGrenades.length }}</span>
        </div>
        <div class="nd-deck-rail">
          <article
            v-for="g in learningGrenades"
            :key="g.id"
            class="nd-deck-card"
            @click="openGrenade = g"
          >
            <div class="nd-deck-media">
              <img v-if="g.cover_file_id" :src="`/api/media/${encodeURIComponent(g.cover_file_id)}`" alt="" />
              <span v-else class="nd-deck-thumb-label">{{ g.map_display_name }}</span>
            </div>
            <div class="nd-deck-body">
              <span class="nd-deck-name">{{ g.name }}</span>
              <span class="nd-deck-meta">{{ g.map_display_name }} · {{ getTypeDisplayName(g.grenade_type) }}</span>
            </div>
          </article>
        </div>
      </section>

      <!-- Map strip -->
      <div class="nd-map-strip">
        <div
          class="nd-map-tile"
          :class="{ active: activeMapId === null }"
          @click="activeMapId = null"
        >
          <span class="nd-map-code">All</span>
          <span class="nd-map-name">Every map</span>
          <span class="nd-map-count">{{ totalLineupCount }} lineups</span>
        </div>
        <div
          v-for="m in mapsWithCounts"
          :key="m.id"
          class="nd-map-tile"
          :class="{ active: activeMapId === m.id }"
          @click="activeMapId = m.id"
        >
          <span class="nd-map-code">DE_</span>
          <span class="nd-map-name">{{ m.display_name }}</span>
          <span class="nd-map-count">{{ m.count }} lineups</span>
        </div>
      </div>

      <!-- Filter bar -->
      <div class="nd-filter-bar">
        <div v-if="mapsWithImage.length" class="nd-filter-row">
          <span class="nd-filter-label">Map view</span>
          <button
            v-for="m in mapsWithImage"
            :key="m.id"
            class="nd-chip"
            type="button"
            @click="openMapPreview(m)"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="nd-chip-icon"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m21 15-5-5L5 21"/></svg>
            {{ m.display_name }}
          </button>
        </div>
        <div class="nd-filter-row">
          <span class="nd-filter-label">Type</span>
          <button
            v-for="t in allTypes"
            :key="t.id"
            class="nd-chip"
            :class="{ active: activeTypeNames.includes(t.name) }"
            :style="{ '--chip-color': `var(${getTypeColorVar(t.name)})` }"
            @click="toggleType(t.name)"
          >
            <span class="nd-dot" />
            {{ t.display_name }}
          </button>
          <div class="nd-filter-divider" />
          <span class="nd-filter-label">Side</span>
          <button
            v-for="s in ['any', 'T', 'CT']"
            :key="s"
            class="nd-chip"
            :class="{ active: side === s }"
            @click="side = s as typeof side"
          >
            {{ s === 'any' ? 'Any' : s }}
          </button>
          <div class="nd-spacer" />
          <select v-model="sort" class="nd-sort-select">
            <option value="recent">Most recent</option>
            <option value="alpha">A → Z</option>
          </select>
          <div class="nd-view-toggle">
            <button :class="{ active: view === 'grid' }" @click="view = 'grid'">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>
            </button>
            <button :class="{ active: view === 'list' }" @click="view = 'list'">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M3 6h18M3 12h18M3 18h18"/></svg>
            </button>
          </div>
        </div>

        <!-- Active filter pills -->
        <div v-if="hasFilters" class="nd-filter-row nd-active-filters">
          <span class="nd-filter-label">Active</span>
          <span v-if="activeMapObj" class="nd-pill">
            {{ activeMapObj.display_name }}
            <button @click="activeMapId = null">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>
            </button>
          </span>
          <span v-for="tn in activeTypeNames" :key="tn" class="nd-pill">
            {{ getTypeDisplayName(tn) }}
            <button @click="toggleType(tn)">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>
            </button>
          </span>
          <span v-if="side !== 'any'" class="nd-pill">
            {{ side }}-side
            <button @click="side = 'any'">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>
            </button>
          </span>
          <button class="nd-clear-all" @click="clearAll">Clear all</button>
        </div>
      </div>

      <!-- Results meta -->
      <div class="nd-results-meta">
        <span>
          <strong>{{ filtered.length }}</strong>
          {{ filtered.length === 1 ? 'lineup' : 'lineups' }}
          <template v-if="activeMapObj"> on {{ activeMapObj.display_name }}</template>
        </span>
        <span class="nd-mono" style="font-size:11px;color:var(--text-3);text-transform:uppercase;letter-spacing:.08em">
          sort · {{ sort }}
        </span>
      </div>

      <!-- Empty state -->
      <div v-if="filtered.length === 0" class="nd-empty">
        <div class="nd-empty-glyph">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>
        </div>
        <h3>No lineups found</h3>
        <p>Try different filters or add a new lineup.</p>
        <button class="nd-btn-primary" @click="clearAll">Clear filters</button>
      </div>

      <!-- Grid -->
      <div v-else :class="['nd-grid', { 'nd-list': view === 'list' }]">
        <article
          v-for="g in filtered"
          :key="g.id"
          class="nd-card"
          @click="openGrenade = g"
        >
          <div class="nd-card-media">
            <img v-if="g.cover_file_id" :src="`/api/media/${encodeURIComponent(g.cover_file_id)}`" alt="" class="nd-cover-img" />
            <img v-else-if="g.image_url" :src="g.image_url" alt="" class="nd-cover-img" />
            <div v-else class="nd-card-thumb">
              <span class="nd-card-thumb-label">{{ g.map_display_name }}</span>
            </div>
            <div class="nd-card-overlay" />
            <div class="nd-card-badges">
              <GrenadeTypeBadge :type-name="g.grenade_type" :display-name="getTypeDisplayName(g.grenade_type)" />
              <span class="nd-tag-badge">{{ g.side }}</span>
              <GrenadeStatusBadge :status="statusOf(g.id)" />
            </div>
            <div class="nd-card-actions" @click.stop>
              <button title="Edit" @click.stop="handleEdit(g)">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z"/></svg>
              </button>
              <button title="Delete" class="nd-danger" @click.stop="handleDelete(g)">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/></svg>
              </button>
            </div>
          </div>

          <div class="nd-card-body">
            <h3 class="nd-card-title">
              {{ g.name }}
              <span class="nd-card-map">{{ g.map_display_name }}</span>
            </h3>
            <div v-if="g.line" class="nd-card-route">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:12px;height:12px;color:var(--accent)"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
              {{ g.line }}
            </div>
            <div class="nd-card-tags">
              <span class="nd-tag">{{ g.difficulty }}</span>
              <span v-if="g.side !== 'both'" class="nd-tag">{{ g.side }}-side</span>
            </div>
            <div class="nd-card-meta">
              <span class="nd-card-meta-desc">{{ g.lineup_instructions?.slice(0, 60) }}{{ g.lineup_instructions?.length > 60 ? '…' : '' }}</span>
            </div>
          </div>
        </article>
      </div>
    </main>

    <!-- FAB (mobile) -->
    <button class="nd-fab" title="New lineup" @click="handleCreate">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>
    </button>

    <!-- ── MAP PREVIEW MODAL ──────────────────────────────── -->
    <Teleport to="body">
      <div v-if="mapPreview" class="nd-modal-backdrop" @click.self="mapPreview = null">
        <div class="nd-map-preview">
          <div class="nd-map-preview-head">
            <span class="nd-map-preview-title">{{ mapPreview.name }}</span>
            <button class="nd-modal-close nd-map-preview-close" @click="mapPreview = null">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>
            </button>
          </div>
          <div class="nd-map-preview-body">
            <img :src="mapPreview.url" :alt="mapPreview.name" />
          </div>
        </div>
      </div>
    </Teleport>

    <!-- ── MODAL ──────────────────────────────────────────── -->
    <Teleport to="body">
      <div v-if="openGrenade" class="nd-modal-backdrop" @click.self="openGrenade = null">
        <div class="nd-modal">
          <!-- Media side -->
          <div class="nd-modal-media">
            <MediaGallery
              :media="modalMedia"
              :loading="modalMediaLoading"
              :cover-file-id="openGrenade?.cover_file_id"
              :placeholder-text="`${openGrenade.map_display_name} · ${getTypeDisplayName(openGrenade.grenade_type)}`"
            />
            <button class="nd-modal-close" @click="openGrenade = null">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>
            </button>
          </div>

          <!-- Info side -->
          <div class="nd-modal-info">
            <div class="nd-modal-eyebrow">
              <GrenadeTypeBadge :type-name="openGrenade.grenade_type" :display-name="getTypeDisplayName(openGrenade.grenade_type)" variant="pill" />
              <span>{{ openGrenade.map_display_name }}</span>
            </div>

            <h2>{{ openGrenade.name }}</h2>

            <div class="nd-modal-section">
              <h3>Instructions</h3>
              <p>{{ openGrenade.lineup_instructions }}</p>
            </div>

            <div class="nd-modal-section">
              <h3>Details</h3>
              <dl class="nd-kv">
                <dt>Map</dt><dd>{{ openGrenade.map_display_name }}</dd>
                <dt>Side</dt><dd>{{ openGrenade.side }}</dd>
                <dt>Difficulty</dt><dd>{{ openGrenade.difficulty }}</dd>
                <template v-if="openGrenade.line">
                  <dt>Line</dt><dd>{{ openGrenade.line }}</dd>
                </template>
              </dl>
            </div>

            <div v-if="isAuthenticated" class="nd-modal-section">
              <h3>{{ t('flashcard.yourDeck') }}</h3>
              <GrenadeStatusSwitch :granade-id="openGrenade.id" />
            </div>

            <div class="nd-modal-foot">
              <button class="nd-btn-ghost nd-btn-full" @click="handleEdit(openGrenade)">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z"/></svg>
                Edit
              </button>
              <button class="nd-icon-btn nd-danger-btn" title="Delete" @click="handleDelete(openGrenade)">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/></svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<style lang="scss" scoped>
@use '~/assets/styles/mixins' as *;

.nd-mono { font-family: 'JetBrains Mono', ui-monospace, 'SF Mono', Menlo, monospace; }

/* ── App shell ──────────────────────────────────────────── */
.nd-app {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

/* ── Header ─────────────────────────────────────────────── */
.nd-header {
  position: sticky;
  top: 0;
  z-index: 40;
  background: color-mix(in oklab, var(--bg-0) 88%, transparent);
  backdrop-filter: saturate(140%) blur(12px);
  -webkit-backdrop-filter: saturate(140%) blur(12px);
  border-bottom: 1px solid var(--line);
}
.nd-header-inner {
  max-width: 1480px;
  margin: 0 auto;
  padding: 14px 18px;
  display: flex;
  align-items: center;
  gap: 14px;
}
.nd-brand {
  display: flex;
  align-items: center;
  gap: 10px;
  font-weight: 700;
  letter-spacing: .02em;
  font-size: 17px;
  text-decoration: none;
  color: var(--text-1);
}
.nd-brand-mark {
  width: 28px;
  height: 28px;
  border-radius: 7px;
  background: linear-gradient(135deg, var(--accent), oklch(0.66 .18 200));
  display: grid;
  place-items: center;
  color: var(--accent-ink);
  font-family: 'JetBrains Mono', monospace;
  font-weight: 700;
  font-size: 13px;
  box-shadow: 0 0 0 1px var(--line-strong), 0 0 24px var(--accent-glow);
}
.nd-brand-name span { color: var(--accent); }
.nd-search {
  flex: 1;
  max-width: 460px;
  position: relative;
  display: flex;
  align-items: center;
}
.nd-search input {
  width: 100%;
  height: 40px;
  padding: 0 14px 0 38px;
  background: var(--bg-2);
  border: 1px solid var(--line);
  border-radius: 10px;
  color: var(--text-1);
  outline: none;
  font-size: 14px;
  transition: border-color .15s, box-shadow .15s;
}
.nd-search input:focus {
  border-color: var(--accent);
  box-shadow: 0 0 0 3px var(--accent-soft);
}
.nd-search input::placeholder { color: var(--text-3); }
.nd-search svg {
  position: absolute;
  left: 12px;
  width: 16px; height: 16px;
  color: var(--text-3);
  pointer-events: none;
}
.nd-kbd {
  position: absolute;
  right: 10px;
  font-size: 11px;
  color: var(--text-3);
  border: 1px solid var(--line);
  padding: 2px 6px;
  border-radius: 4px;
  font-family: 'JetBrains Mono', monospace;
}
.nd-header-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}
.nd-icon-btn {
  width: 40px; height: 40px;
  display: grid; place-items: center;
  background: var(--bg-2);
  border: 1px solid var(--line);
  border-radius: 10px;
  color: var(--text-2);
  transition: all .15s;
}
.nd-icon-btn:hover { border-color: var(--line-strong); color: var(--text-1); }
.nd-icon-btn svg { width: 18px; height: 18px; }
.nd-btn-primary {
  height: 40px;
  padding: 0 16px;
  background: var(--accent);
  color: var(--accent-ink);
  border: none;
  border-radius: 10px;
  font-weight: 600;
  font-size: 14px;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  transition: transform .1s, box-shadow .15s;
  box-shadow: 0 0 0 1px var(--accent), 0 8px 24px var(--accent-glow);
}
.nd-btn-primary:hover { transform: translateY(-1px); box-shadow: 0 0 0 1px var(--accent), 0 12px 32px var(--accent-glow); }
.nd-btn-primary:active { transform: translateY(0); }
.nd-btn-primary svg { width: 16px; height: 16px; }
.nd-btn-ghost {
  height: 40px;
  padding: 0 14px;
  background: transparent;
  color: var(--text-2);
  border: 1px solid var(--line);
  border-radius: 10px;
  font-size: 14px;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  text-decoration: none;
  transition: all .15s;
}
.nd-btn-ghost:hover { color: var(--text-1); border-color: var(--line-strong); }
.nd-btn-ghost svg { width: 16px; height: 16px; }
.nd-btn-full { flex: 1; justify-content: center; }
.nd-avatar {
  width: 36px; height: 36px;
  border-radius: 10px;
  background: linear-gradient(135deg, var(--magenta), var(--accent));
  color: white;
  display: grid; place-items: center;
  font-weight: 700;
  font-size: 13px;
  border: 1px solid var(--line);
  font-family: 'JetBrains Mono', monospace;
}
.nd-spacer { flex: 1; }

/* ── Mobile search ──────────────────────────────────────── */
.nd-mobile-search { display: none; }

/* ── Page ───────────────────────────────────────────────── */
.nd-page {
  max-width: 1480px;
  width: 100%;
  margin: 0 auto;
  padding: 24px 18px 80px;
}

/* ── Hero ───────────────────────────────────────────────── */
.nd-hero {
  display: grid;
  grid-template-columns: 1fr;
  gap: 18px;
  margin-bottom: 28px;
}
.nd-hero-headline h1 {
  margin: 0 0 6px;
  font-size: 28px;
  letter-spacing: -.01em;
  font-weight: 700;
}
.nd-hero-headline p {
  margin: 0;
  color: var(--text-2);
  font-size: 14px;
}
.nd-hero-stats {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 10px;
}
.nd-stat {
  background: var(--bg-1);
  border: 1px solid var(--line);
  border-radius: var(--radius);
  padding: 14px 16px;
  position: relative;
  overflow: hidden;
}
.nd-stat::before {
  content: "";
  position: absolute;
  inset: 0;
  background: radial-gradient(circle at top right, var(--accent-soft), transparent 60%);
  opacity: 0;
  transition: opacity .2s;
}
.nd-stat:hover::before { opacity: 1; }
.nd-stat-label {
  font-family: 'JetBrains Mono', monospace;
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: .08em;
  color: var(--text-3);
  margin-bottom: 6px;
}
.nd-stat-value {
  font-size: 26px;
  font-weight: 700;
  letter-spacing: -.01em;
}
.nd-stat-spark {
  display: flex;
  gap: 2px;
  align-items: flex-end;
  margin-top: 8px;
  height: 22px;
}
.nd-stat-spark span {
  flex: 1;
  background: var(--accent);
  border-radius: 1px;
  opacity: .7;
}

/* ── In-progress deck ───────────────────────────────────── */
.nd-deck {
  margin-bottom: 28px;
}
.nd-deck-head {
  display: flex;
  align-items: baseline;
  gap: 10px;
  margin-bottom: 12px;
}
.nd-deck-head h2 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  letter-spacing: -.005em;
}
.nd-deck-count {
  font-family: 'JetBrains Mono', monospace;
  font-size: 11px;
  color: var(--text-3);
  text-transform: uppercase;
  letter-spacing: .08em;
}
.nd-deck-rail {
  display: flex;
  gap: 12px;
  overflow-x: auto;
  scroll-snap-type: x mandatory;
  scrollbar-width: thin;
  padding-bottom: 4px;
  &::-webkit-scrollbar { height: 6px; }
  &::-webkit-scrollbar-thumb { background: var(--line); border-radius: 999px; }
}
.nd-deck-card {
  flex: 0 0 220px;
  scroll-snap-align: start;
  background: var(--bg-1);
  border: 1px solid var(--line);
  border-radius: var(--radius);
  overflow: hidden;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  transition: transform .15s, border-color .15s;
}
.nd-deck-card:hover {
  transform: translateY(-2px);
  border-color: oklch(0.78 .17 220);
}
.nd-deck-media {
  aspect-ratio: 16/10;
  background: var(--bg-3);
  position: relative;
  display: grid;
  place-items: center;
  overflow: hidden;
}
.nd-deck-media img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.nd-deck-thumb-label {
  font-family: 'JetBrains Mono', monospace;
  font-size: 11px;
  color: var(--text-3);
  text-transform: uppercase;
  letter-spacing: .08em;
}
.nd-deck-body {
  padding: 10px 12px 12px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.nd-deck-name {
  font-size: 13px;
  font-weight: 600;
  letter-spacing: -.005em;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.nd-deck-meta {
  font-family: 'JetBrains Mono', monospace;
  font-size: 11px;
  color: var(--text-3);
  text-transform: uppercase;
  letter-spacing: .06em;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* ── Map strip ──────────────────────────────────────────── */
.nd-map-strip {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(130px, 1fr));
  gap: 10px;
  margin-bottom: 24px;
}
.nd-map-tile {
  background: var(--bg-1);
  border: 1px solid var(--line);
  border-radius: var(--radius);
  padding: 14px;
  cursor: pointer;
  transition: all .15s;
  display: flex;
  flex-direction: column;
  gap: 8px;
  position: relative;
  overflow: hidden;
}
.nd-map-tile:hover { border-color: var(--line-strong); transform: translateY(-2px); }
.nd-map-tile.active {
  border-color: var(--accent);
  box-shadow: 0 0 0 1px var(--accent), 0 0 24px var(--accent-glow);
}
.nd-map-code {
  font-family: 'JetBrains Mono', monospace;
  font-size: 10px;
  color: var(--text-3);
  text-transform: uppercase;
  letter-spacing: .1em;
}
.nd-map-name { font-size: 15px; font-weight: 600; }
.nd-map-count {
  font-family: 'JetBrains Mono', monospace;
  font-size: 11px;
  color: var(--text-2);
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: auto;
}
.nd-map-count::before {
  content: "";
  width: 6px; height: 6px;
  border-radius: 50%;
  background: var(--accent);
  box-shadow: 0 0 6px var(--accent);
}
.nd-map-tile.active .nd-map-count::before {
  animation: nd-pulse 1.6s ease-in-out infinite;
}
@keyframes nd-pulse { 50% { opacity: .4; transform: scale(1.3); } }

.nd-chip-icon { width: 14px; height: 14px; color: var(--text-3); }
.nd-chip:hover .nd-chip-icon { color: var(--accent); }

.nd-map-preview {
  width: min(960px, 100%);
  max-height: calc(100vh - 40px);
  background: var(--bg-1);
  border: 1px solid var(--line-strong);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-lg);
  overflow: hidden;
  display: flex;
  flex-direction: column;
  animation: nd-slideup .25s cubic-bezier(.2,.7,.2,1);
}
.nd-map-preview-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 18px;
  border-bottom: 1px solid var(--line);
  background: var(--bg-2);
}
.nd-map-preview-title {
  font-weight: 600;
  font-size: 15px;
  color: var(--text-1);
}
.nd-map-preview-close {
  position: static;
  width: 32px;
  height: 32px;
}
.nd-map-preview-body {
  background: var(--bg-0);
  display: grid;
  place-items: center;
  padding: 18px;
  overflow: auto;
  flex: 1;
}
.nd-map-preview-body img {
  max-width: 100%;
  max-height: calc(100vh - 160px);
  object-fit: contain;
  display: block;
  border-radius: 6px;
}

/* ── Filter bar ─────────────────────────────────────────── */
.nd-filter-bar {
  background: var(--bg-1);
  border: 1px solid var(--line);
  border-radius: var(--radius);
  padding: 14px;
  margin-bottom: 20px;
  display: grid;
  gap: 14px;
}
.nd-filter-row {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}
.nd-filter-label {
  font-family: 'JetBrains Mono', monospace;
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: .08em;
  color: var(--text-3);
  min-width: 46px;
}
.nd-chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 32px;
  padding: 0 12px;
  background: var(--bg-2);
  border: 1px solid var(--line);
  color: var(--text-2);
  border-radius: 999px;
  font-size: 13px;
  cursor: pointer;
  transition: all .15s;
  white-space: nowrap;
}
.nd-chip:hover { color: var(--text-1); border-color: var(--line-strong); }
.nd-chip.active {
  background: var(--accent-soft);
  border-color: var(--accent);
  color: var(--text-1);
  box-shadow: 0 0 0 .5px var(--accent), 0 0 12px var(--accent-glow);
}
.nd-dot {
  width: 8px; height: 8px;
  border-radius: 50%;
  background: var(--chip-color, var(--text-3));
}
.nd-chip.active .nd-dot { background: var(--chip-color, var(--accent)); }
.nd-filter-divider { width: 1px; height: 22px; background: var(--line); }
.nd-sort-select {
  height: 32px;
  padding: 0 32px 0 12px;
  background: var(--bg-2);
  border: 1px solid var(--line);
  color: var(--text-1);
  border-radius: 999px;
  font-size: 13px;
  appearance: none;
  background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23a4abbb' stroke-width='2.5'><polyline points='6 9 12 15 18 9'/></svg>");
  background-repeat: no-repeat;
  background-position: right 10px center;
  cursor: pointer;
}
.nd-view-toggle {
  display: inline-flex;
  background: var(--bg-2);
  border: 1px solid var(--line);
  border-radius: 999px;
  padding: 3px;
}
.nd-view-toggle button {
  width: 30px; height: 26px;
  background: transparent;
  border: none;
  color: var(--text-3);
  border-radius: 999px;
  display: grid; place-items: center;
}
.nd-view-toggle button.active { background: var(--bg-3); color: var(--text-1); }
.nd-view-toggle svg { width: 14px; height: 14px; }
.nd-active-filters {
  font-size: 13px;
  color: var(--text-2);
}
.nd-pill {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 26px;
  padding: 0 6px 0 10px;
  background: var(--accent-soft);
  border: 1px solid var(--accent);
  color: var(--text-1);
  border-radius: 999px;
  font-size: 12px;
}
.nd-pill button {
  width: 18px; height: 18px;
  border-radius: 50%;
  border: none;
  background: transparent;
  color: var(--text-2);
  display: grid; place-items: center;
  padding: 0;
}
.nd-pill button:hover { background: rgba(255,255,255,.08); color: var(--text-1); }
.nd-pill svg { width: 10px; height: 10px; }
.nd-clear-all {
  background: transparent;
  border: none;
  color: var(--text-3);
  font-size: 12px;
  text-decoration: underline;
  text-underline-offset: 3px;
}
.nd-clear-all:hover { color: var(--text-1); }

/* ── Results meta ───────────────────────────────────────── */
.nd-results-meta {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  margin-bottom: 14px;
  font-size: 13px;
  color: var(--text-2);
}
.nd-results-meta strong { color: var(--text-1); }

/* ── Empty state ────────────────────────────────────────── */
.nd-empty {
  text-align: center;
  padding: 60px 20px;
  border: 1px dashed var(--line);
  border-radius: var(--radius);
  color: var(--text-2);
}
.nd-empty-glyph {
  width: 56px; height: 56px;
  margin: 0 auto 14px;
  border-radius: 14px;
  background: var(--bg-2);
  border: 1px solid var(--line);
  display: grid; place-items: center;
  color: var(--text-3);
}
.nd-empty-glyph svg { width: 22px; height: 22px; }
.nd-empty h3 { margin: 0 0 6px; font-size: 16px; color: var(--text-1); }
.nd-empty p { margin: 0 0 16px; font-size: 13px; }

/* ── Grid ───────────────────────────────────────────────── */
.nd-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 16px;
}
.nd-list {
  grid-template-columns: 1fr;
}

/* ── Cover image ────────────────────────────────────────── */
.nd-cover-img {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

/* ── Card ───────────────────────────────────────────────── */
.nd-card {
  background: var(--bg-1);
  border: 1px solid var(--line);
  border-radius: var(--radius);
  overflow: hidden;
  cursor: pointer;
  transition: transform .18s, border-color .18s, box-shadow .18s;
  position: relative;
  display: flex;
  flex-direction: column;
}
.nd-card:hover {
  transform: translateY(-2px);
  border-color: var(--line-strong);
  box-shadow: var(--shadow);
}
.nd-list .nd-card {
  flex-direction: row;
}
.nd-list .nd-card-media {
  width: 180px;
  flex-shrink: 0;
  aspect-ratio: auto;
}
.nd-card-media {
  aspect-ratio: 16/10;
  position: relative;
  overflow: hidden;
  background: var(--bg-3);
}
.nd-card-thumb {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  font-family: 'JetBrains Mono', monospace;
  font-size: 11px;
  color: var(--text-3);
  letter-spacing: .08em;
  text-transform: uppercase;
}
.nd-card-thumb::before {
  content: "";
  position: absolute;
  inset: 0;
  background: repeating-linear-gradient(45deg, var(--bg-2) 0 12px, var(--bg-3) 12px 24px);
  opacity: .7;
}
.nd-card-thumb-label {
  position: relative;
  background: rgba(0,0,0,.55);
  padding: 4px 10px;
  border-radius: 4px;
  border: 1px solid var(--line-strong);
}
[data-theme="light"] .nd-card-thumb-label { background: rgba(255,255,255,.7); color: var(--text-2); }
.nd-card-overlay {
  position: absolute;
  inset: 0;
  background: linear-gradient(180deg, transparent 40%, rgba(0,0,0,.85));
  pointer-events: none;
}
[data-theme="light"] .nd-card-overlay { background: linear-gradient(180deg, transparent 40%, rgba(0,0,0,.55)); }
.nd-card-badges {
  position: absolute;
  top: 10px; left: 10px;
  display: flex;
  gap: 6px;
  z-index: 2;
}
.nd-gt-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 26px;
  padding: 0 10px;
  background: rgba(13,15,20,.78);
  backdrop-filter: blur(8px);
  border: 1px solid var(--gt-color, var(--line-strong));
  color: var(--gt-color, var(--text-1));
  border-radius: 999px;
  font-size: 11px;
  font-family: 'JetBrains Mono', monospace;
  text-transform: uppercase;
  letter-spacing: .06em;
  font-weight: 600;
}
.nd-gt-dot {
  width: 6px; height: 6px;
  border-radius: 50%;
  background: var(--gt-color, var(--accent));
  box-shadow: 0 0 8px var(--gt-color, var(--accent));
}
.nd-tag-badge {
  display: inline-flex;
  align-items: center;
  height: 26px;
  padding: 0 10px;
  background: rgba(13,15,20,.78);
  backdrop-filter: blur(8px);
  border: 1px solid var(--line-strong);
  color: var(--text-2);
  border-radius: 999px;
  font-size: 11px;
  font-family: 'JetBrains Mono', monospace;
  text-transform: uppercase;
  letter-spacing: .06em;
}
.nd-card-actions {
  position: absolute;
  top: 10px; right: 10px;
  display: flex;
  gap: 6px;
  opacity: 0;
  transform: translateY(-4px);
  transition: opacity .15s, transform .15s;
  z-index: 2;
}
.nd-card:hover .nd-card-actions { opacity: 1; transform: translateY(0); }
.nd-card-actions button {
  width: 30px; height: 30px;
  border-radius: 8px;
  background: rgba(13,15,20,.78);
  backdrop-filter: blur(8px);
  border: 1px solid var(--line-strong);
  color: var(--text-1);
  display: grid; place-items: center;
}
.nd-card-actions button:hover { border-color: var(--accent); color: var(--accent); }
.nd-card-actions .nd-danger:hover { border-color: var(--red); color: var(--red); }
.nd-card-actions svg { width: 14px; height: 14px; }
.nd-card-body {
  padding: 14px 16px 16px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  flex: 1;
}
.nd-card-title {
  margin: 0;
  font-size: 15px;
  font-weight: 600;
  letter-spacing: -.005em;
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 8px;
}
.nd-card-map {
  font-family: 'JetBrains Mono', monospace;
  font-size: 11px;
  color: var(--text-3);
  text-transform: uppercase;
  letter-spacing: .08em;
  font-weight: 500;
  flex-shrink: 0;
}
.nd-card-route {
  display: flex;
  align-items: center;
  gap: 6px;
  font-family: 'JetBrains Mono', monospace;
  font-size: 12px;
  color: var(--text-2);
}
.nd-card-tags { display: flex; gap: 6px; flex-wrap: wrap; }
.nd-tag {
  display: inline-flex;
  align-items: center;
  height: 22px;
  padding: 0 8px;
  background: var(--bg-2);
  border: 1px solid var(--line);
  border-radius: 999px;
  font-size: 11px;
  color: var(--text-2);
  font-family: 'JetBrains Mono', monospace;
}
.nd-card-meta {
  margin-top: auto;
  padding-top: 8px;
  border-top: 1px dashed var(--line);
}
.nd-card-meta-desc {
  font-size: 12px;
  color: var(--text-3);
  line-height: 1.4;
}

/* ── FAB ────────────────────────────────────────────────── */
.nd-fab {
  display: none;
  position: fixed;
  right: 18px;
  bottom: 18px;
  z-index: 50;
  width: 56px; height: 56px;
  border-radius: 18px;
  background: var(--accent);
  color: var(--accent-ink);
  border: none;
  box-shadow: 0 10px 24px var(--accent-glow), 0 0 0 1px var(--accent);
  align-items: center; justify-content: center;
}
.nd-fab svg { width: 22px; height: 22px; }

/* ── Modal ──────────────────────────────────────────────── */
.nd-modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(2,4,8,.7);
  backdrop-filter: blur(6px);
  z-index: 100;
  display: grid;
  place-items: center;
  padding: 20px;
  animation: nd-fadein .18s ease-out;
}
@keyframes nd-fadein { from { opacity: 0; } }
.nd-modal {
  width: min(960px, 100%);
  max-height: calc(100vh - 40px);
  background: var(--bg-1);
  border: 1px solid var(--line-strong);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-lg);
  overflow: hidden;
  display: grid;
  grid-template-columns: 1.4fr 1fr;
  animation: nd-slideup .25s cubic-bezier(.2,.7,.2,1);
}
@keyframes nd-slideup { from { transform: translateY(20px); opacity: 0; } }
.nd-modal-media {
  background: var(--bg-0);
  position: relative;
  min-height: 300px;
  display: flex;
  flex-direction: column;
}
.nd-modal-media-main {
  flex: 1;
  position: relative;
  overflow: hidden;
}
.nd-modal-ph {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  font-family: 'JetBrains Mono', monospace;
  font-size: 12px;
  color: var(--text-3);
  letter-spacing: .1em;
  text-transform: uppercase;
  background: repeating-linear-gradient(45deg, var(--bg-1) 0 14px, var(--bg-2) 14px 28px);
}
.nd-modal-ph-label {
  position: relative;
  background: rgba(0,0,0,.55);
  padding: 6px 12px;
  border-radius: 6px;
  border: 1px solid var(--line-strong);
}
.nd-modal-img {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.nd-modal-video {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: contain;
  background: #000;
}
.nd-modal-nav {
  position: absolute;
  bottom: 14px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  gap: 8px;
  background: rgba(13, 15, 20, .82);
  backdrop-filter: blur(8px);
  border: 1px solid var(--line-strong);
  border-radius: 999px;
  padding: 4px 8px 4px 4px;
  z-index: 5;
}
.nd-modal-nav-btn {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  border: none;
  background: transparent;
  color: var(--text-1);
  display: grid;
  place-items: center;
  transition: background .12s;
}
.nd-modal-nav-btn:hover:not(:disabled) { background: rgba(255,255,255,.1); }
.nd-modal-nav-btn:disabled { opacity: .3; }
.nd-modal-nav-btn svg { width: 14px; height: 14px; }
.nd-modal-nav-count {
  font-family: 'JetBrains Mono', monospace;
  font-size: 11px;
  color: var(--text-2);
  min-width: 32px;
  text-align: center;
}
.nd-modal-thumbs {
  display: flex;
  gap: 6px;
  padding: 10px 12px;
  background: var(--bg-0);
  border-top: 1px solid var(--line);
  overflow-x: auto;
  scrollbar-width: none;
  &::-webkit-scrollbar { display: none; }
}
.nd-modal-thumb {
  flex-shrink: 0;
  width: 56px;
  height: 40px;
  border-radius: 6px;
  border: 2px solid transparent;
  overflow: hidden;
  background: var(--bg-2);
  cursor: pointer;
  transition: border-color .15s, opacity .15s;
  padding: 0;
  opacity: .55;
  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
  }
}
.nd-modal-thumb:hover { opacity: .85; }
.nd-modal-thumb.active { border-color: var(--accent); opacity: 1; }
.nd-modal-thumb-video {
  width: 100%;
  height: 100%;
  display: grid;
  place-items: center;
  color: var(--text-2);
  svg { width: 16px; height: 16px; }
}
.nd-modal-close {
  position: absolute;
  top: 14px; right: 14px;
  z-index: 5;
  width: 36px; height: 36px;
  border-radius: 10px;
  background: rgba(13,15,20,.82);
  backdrop-filter: blur(8px);
  border: 1px solid var(--line-strong);
  color: var(--text-1);
  display: grid; place-items: center;
}
.nd-modal-close svg { width: 16px; height: 16px; }
.nd-modal-info {
  padding: 24px 26px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 18px;
}
.nd-modal-info h2 {
  margin: 0;
  font-size: 22px;
  letter-spacing: -.01em;
}
.nd-modal-eyebrow {
  display: flex;
  gap: 8px;
  align-items: center;
  font-family: 'JetBrains Mono', monospace;
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: .1em;
  color: var(--text-3);
}
.nd-gt-pill {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 3px 8px;
  border-radius: 4px;
  background: color-mix(in oklab, var(--gt-color, var(--accent)) 15%, transparent);
  color: var(--gt-color, var(--accent));
  border: 1px solid var(--gt-color, var(--accent));
}
.nd-gt-pill .nd-gt-dot { width: 6px; height: 6px; border-radius: 50%; background: currentColor; }
.nd-modal-section h3 {
  margin: 0 0 8px;
  font-size: 12px;
  font-family: 'JetBrains Mono', monospace;
  text-transform: uppercase;
  letter-spacing: .1em;
  color: var(--text-3);
}
.nd-modal-section p {
  margin: 0;
  color: var(--text-1);
  font-size: 14px;
  line-height: 1.55;
}
.nd-kv {
  display: grid;
  grid-template-columns: max-content 1fr;
  gap: 6px 18px;
  font-family: 'JetBrains Mono', monospace;
  font-size: 12px;
  margin: 0;
}
.nd-kv dt { color: var(--text-3); }
.nd-kv dd { margin: 0; color: var(--text-1); }
.nd-modal-foot {
  display: flex;
  gap: 8px;
  padding-top: 8px;
  margin-top: auto;
  border-top: 1px dashed var(--line);
}
.nd-danger-btn:hover { color: var(--red); border-color: var(--red); }

/* ── Responsive ─────────────────────────────────────────── */
@media (min-width: 720px) {
  .nd-hero { grid-template-columns: 1fr auto; align-items: end; }
}

@include respond-to(880) {
  .nd-modal { grid-template-columns: 1fr; max-height: calc(100dvh - 24px); }
}

@include respond-to(720) {
  .nd-search { display: none; }
  .nd-mobile-search {
    display: block;
    padding: 0 18px 12px;
    background: var(--bg-0);

    &-inner { position: relative; max-width: 1480px; margin: 0 auto; display: flex; align-items: center; }
    input { width: 100%; height: 38px; padding: 0 14px 0 36px; background: var(--bg-2); border: 1px solid var(--line); border-radius: 10px; color: var(--text-1); outline: none; font-size: 14px; }
    svg { position: absolute; left: 12px; width: 16px; height: 16px; color: var(--text-3); pointer-events: none; }
  }
  .nd-hero-headline h1 { font-size: 22px; }
  .nd-hero-stats { grid-template-columns: repeat(2, 1fr); }
  .nd-stat-value { font-size: 22px; }
  .nd-grid { grid-template-columns: 1fr; }
  .nd-filter-label { width: 100%; }
  .nd-btn-primary .nd-label { display: none; }
  .nd-btn-ghost span { display: none; }
  .nd-page { padding: 18px 14px 80px; }
  .nd-header-inner { padding: 12px 14px; gap: 8px; }
  .nd-filter-bar { padding: 12px; }
  .nd-fab { display: grid; place-items: center; }
}

@include respond-to(460) {
  .nd-hero-stats { grid-template-columns: 1fr 1fr; }
  .nd-map-strip { grid-template-columns: repeat(2, 1fr); }
}
</style>
