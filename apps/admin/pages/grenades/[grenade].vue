<script setup lang="ts">
import { computed } from 'vue';
import { useRoute } from '#app';
import {
  getMapName,
  getSideName,
  getDifficultyName,
  getLineName,
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

const buildMediaUrl = (fileId: string) => `/api/media/${fileId}`;

const formatMap = (value: string) => getMapName(value) ?? value;
const formatSide = (value: string) => getSideName(value) ?? value;
const formatDifficulty = (value: string) => getDifficultyName(value) ?? value;
const formatLine = (value: string | null | undefined) =>
  value ? getLineName(value) ?? value : '—';
</script>

<template>
  <main class="mx-auto max-w-3xl px-6 py-8 text-slate-50">
    <NuxtLink to="/grenades" class="text-sm text-slate-400 hover:text-slate-200">{{ $t('components.grenadeDetail.back') }}</NuxtLink>

    <section v-if="pending" class="mt-8 text-slate-400">{{ $t('components.grenadeDetail.loading') }}</section>
    <section v-else-if="error" class="mt-8 text-rose-400">
      {{ error.statusMessage ?? $t('components.grenadeDetail.error') }}
    </section>
    <section v-else-if="grenade" class="mt-6 space-y-6">
      <header>
        <h1 class="text-2xl font-semibold">{{ grenade.name }}</h1>
        <p class="text-sm text-slate-400">
          {{ formatMap(grenade.map_name) }} • {{ formatSide(grenade.side) }} •
          {{ formatLine(grenade.line) }} • {{ formatDifficulty(grenade.difficulty) }}
        </p>
      </header>

      <p class="whitespace-pre-line text-sm text-slate-200">
        {{ grenade.lineup_instructions }}
      </p>

      <div v-if="media.length" class="grid gap-4 md:grid-cols-2">
        <article
          v-for="item in media"
          :key="item.id"
          class="space-y-2 rounded-lg border border-slate-800 bg-slate-900 p-3"
        >
          <img
            v-if="item.media_type === 'photo'"
            :src="buildMediaUrl(item.file_id)"
            alt="Фото гранаты"
            class="w-full rounded-md object-cover"
            loading="lazy"
          />
          <video
            v-else
            controls
            preload="metadata"
            :src="buildMediaUrl(item.file_id)"
            class="w-full rounded-md"
          />
          <p v-if="item.caption" class="text-xs text-slate-400">
            {{ item.caption }}
          </p>
        </article>
      </div>
      <p v-else class="text-sm text-slate-400">{{ $t('components.grenadeDetail.noMedia') }}</p>
    </section>
  </main>
</template>

