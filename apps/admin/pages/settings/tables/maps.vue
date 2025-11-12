<template>
  <div class="min-h-screen bg-slate-950 text-slate-50">
    <header class="border-b border-slate-800 bg-slate-900/70 backdrop-blur">
      <div class="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <h1 class="text-xl font-semibold tracking-tight">Maps</h1>
        <NuxtLink to="/settings" class="text-sm text-slate-400 hover:text-slate-200">
          ← Back to Settings
        </NuxtLink>
      </div>
    </header>

    <main class="mx-auto max-w-6xl px-6 py-8">
      <section v-if="pending" class="grid h-48 place-items-center rounded-lg border border-slate-800 bg-slate-900">
        <span class="text-sm text-slate-400">Загружаем данные…</span>
      </section>

      <section
        v-else-if="error"
        class="rounded-lg border border-rose-900/50 bg-rose-900/20 px-4 py-3 text-rose-200"
      >
        {{ error.statusMessage ?? 'Не удалось загрузить карты' }}
      </section>

      <section v-else class="overflow-x-auto rounded-lg border border-slate-800 bg-slate-900">
        <table class="w-full">
          <thead class="border-b border-slate-800 bg-slate-800/50">
            <tr>
              <th class="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-300">
                ID
              </th>
              <th class="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-300">
                Name (Key)
              </th>
              <th class="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-300">
                Display Name
              </th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-800">
            <tr
              v-for="map in maps"
              :key="map.id"
              class="hover:bg-slate-800/30 transition-colors"
            >
              <td class="px-6 py-4 whitespace-nowrap text-sm text-slate-300">
                {{ map.id }}
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm font-mono text-slate-200">
                {{ map.name }}
              </td>
              <td class="px-6 py-4 text-sm text-slate-100">
                {{ map.display_name }}
              </td>
            </tr>
            <tr v-if="!maps.length">
              <td colspan="3" class="px-6 py-8 text-center text-sm text-slate-400">
                Карты не найдены
              </td>
            </tr>
          </tbody>
        </table>
      </section>

      <div v-if="maps.length" class="mt-4 text-sm text-slate-400">
        Всего карт: {{ maps.length }}
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import type { MapRecord } from '@shared/utils/types';

const { data, pending, error } = await useFetch('/api/maps', {
  transform: (response: { data: MapRecord[] }) => response.data,
});

const maps = computed(() => data.value ?? []);
</script>

