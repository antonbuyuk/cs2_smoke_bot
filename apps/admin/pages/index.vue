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
  <div class="bg-slate-950">
    demo page
  </div>
</template>
