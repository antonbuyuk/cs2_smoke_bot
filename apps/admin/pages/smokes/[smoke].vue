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

const route = useRoute();
const smokeId = computed(() => Number.parseInt(String(route.params.smoke), 10));

const { data, pending, error } = await useFetch(`/api/smokes/${smokeId.value}`, {
  key: `smoke-${smokeId.value}`,
  transform: (payload: { smoke: SmokeWithMap; media: SmokeMediaRecord[] }) => payload,
});

const smoke = computed(() => data.value?.smoke);
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
    <NuxtLink to="/smokes" class="text-sm text-slate-400 hover:text-slate-200">← Back</NuxtLink>

    <section v-if="pending" class="mt-8 text-slate-400">Loading…</section>
    <section v-else-if="error" class="mt-8 text-rose-400">
      {{ error.statusMessage ?? 'Failed to load smoke' }}
    </section>
    <section v-else-if="smoke" class="mt-6 space-y-6">
      <header>
        <h1 class="text-2xl font-semibold">{{ smoke.name }}</h1>
        <p class="text-sm text-slate-400">
          {{ formatMap(smoke.map_name) }} • {{ formatSide(smoke.side) }} •
          {{ formatLine(smoke.line) }} • {{ formatDifficulty(smoke.difficulty) }}
        </p>
      </header>

      <p class="whitespace-pre-line text-sm text-slate-200">
        {{ smoke.lineup_instructions }}
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
            alt="Smoke photo"
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
      <p v-else class="text-sm text-slate-400">Медиа не прикреплены.</p>
    </section>
  </main>
</template>