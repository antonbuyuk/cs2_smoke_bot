<script setup lang="ts">
import { computed } from 'vue';
import { useRoute } from '#app';
import {
  getSideName,
  getDifficultyName,
  getLineName,
  getGrenadeTypeName,
} from '@shared/config/constants';
import type { SmokeWithMap, SmokeMediaRecord } from '@shared/utils/types';

definePageMeta({
  layout: 'default',
});

const route = useRoute();
const grenadeId = computed(() => Number.parseInt(String(route.params.grenade), 10));

const { data, pending, error } = await useFetch(`/api/grenades/${grenadeId.value}`, {
  key: `grenade-${grenadeId.value}`,
  transform: (payload: { smoke: SmokeWithMap; media: SmokeMediaRecord[] }) => payload,
});

const grenade = computed(() => data.value?.smoke);
const media = computed(() => data.value?.media ?? []);

const buildMediaUrl = (fileId: string) => {
  // Если fileId начинается с /, убираем его для правильного формирования URL
  const cleanFileId = fileId.startsWith('/') ? fileId.slice(1) : fileId;
  return `/api/media/${encodeURIComponent(cleanFileId)}`;
};

const formatSide = (value: string) => getSideName(value) ?? value;
const formatDifficulty = (value: string) => getDifficultyName(value) ?? value;
const formatLine = (value: string | null | undefined) =>
  value ? getLineName(value) ?? value : '—';
const formatGrenade = (value: string) => getGrenadeTypeName(value) ?? value;
</script>

<template>
  <main class="page">
    <NuxtLink class="back-link" to="/grenades">← Back to grenades</NuxtLink>

    <StateBox v-if="pending" type="loading" title="Loading lineup..." />
    <StateBox v-else-if="error" type="error" title="Failed to load lineup" :description="error.statusMessage ?? $t('components.grenadeDetail.error')" />

    <!-- Content -->
    <template v-else-if="grenade">
      <div class="detail-header">
        <h1>{{ grenade.name }}</h1>
        <div class="meta-row">
          <GrenadeTypeBadge :type-name="grenade.grenade_type" :display-name="formatGrenade(grenade.grenade_type)" variant="simple" />
          <span class="badge">{{ grenade.map_display_name }}</span>
          <span class="badge">{{ formatSide(grenade.side) }}-side</span>
          <span v-if="grenade.line" class="badge">{{ formatLine(grenade.line) }}</span>
          <span class="badge">{{ formatDifficulty(grenade.difficulty) }}</span>
        </div>
      </div>

      <div class="section">
        <h2>Instructions</h2>
        <p style="white-space:pre-line">{{ grenade.lineup_instructions }}</p>
      </div>

      <div class="section">
        <h2>Media</h2>
        <StateBox v-if="media.length === 0" type="empty" title="No media available" :description="$t('components.grenadeDetail.noMedia')" />
        <div v-else class="media-grid">
          <div v-for="item in media" :key="item.id" class="media-cell">
            <div class="media-box">
              <img
                v-if="item.media_type === 'photo'"
                :src="buildMediaUrl(item.file_id)"
                alt=""
              />
              <video
                v-else
                controls
                :src="buildMediaUrl(item.file_id)"
              />
            </div>
            <div v-if="item.caption" class="caption">{{ item.caption }}</div>
          </div>
        </div>
      </div>
    </template>
  </main>
</template>

<style lang="scss" scoped>
@use '~/assets/styles/mixins' as *;

// Detail page uses taller badges — pierce into GrenadeTypeBadge component
:deep(.badge) { height: 28px; padding: 0 12px; }

.detail-header {
  margin-bottom: 28px;

  h1 {
    font-size: 28px;
    font-weight: 700;
    letter-spacing: -0.01em;
    margin: 0 0 14px;

    @include respond-to(640) { font-size: 22px; }
  }
}

.meta-row { display: flex; flex-wrap: wrap; gap: 8px; }

.section {
  margin-bottom: 28px;

  h2 {
    font-family: 'JetBrains Mono', monospace;
    font-size: 12px;
    text-transform: uppercase;
    letter-spacing: .1em;
    color: var(--text-3);
    margin: 0 0 12px;
  }

  p { font-size: 15px; line-height: 1.65; color: var(--text-1); max-width: 70ch; margin: 0; }
}

.media-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 16px;

  @include respond-to(640) { grid-template-columns: 1fr; }
}

.media-cell {
  background: var(--bg-1);
  border: 1px solid var(--line);
  border-radius: var(--radius);
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.media-box {
  aspect-ratio: 16/10;
  position: relative;
  overflow: hidden;
  background: var(--bg-3);

  img  { width: 100%; height: 100%; object-fit: cover; display: block; }
  video { width: 100%; height: 100%; display: block; object-fit: contain; background: #000; }
}

.caption { padding: 10px 14px; font-size: 12px; color: var(--text-2); font-family: 'JetBrains Mono', monospace; }
</style>
