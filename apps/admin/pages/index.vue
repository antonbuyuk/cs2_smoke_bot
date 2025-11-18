<script setup lang="ts">
definePageMeta({
  layout: 'default',
});

const { data: grenadesData, pending: grenadesPending } = await useFetch('/api/grenades', {
  transform: (response: { data: unknown[] }) => response.data,
});

const { data: mapsData, pending: mapsPending } = await useFetch('/api/maps', {
  transform: (response: { data: unknown[] }) => response.data,
});

const grenadesCount = computed(() => grenadesData.value?.length ?? 0);
const mapsCount = computed(() => mapsData.value?.length ?? 0);
const isLoading = computed(() => grenadesPending.value || mapsPending.value);
</script>

<template>
  <div class="bg-slate-950">
    demo page
  </div>
</template>
