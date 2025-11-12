<script setup lang="ts">
import { onMounted } from 'vue';

definePageMeta({
  layout: 'default',
})

onMounted(() => {
  console.log('Test');
});
</script>

<template>
  <div>
    <h1>Test</h1>
  </div>
</template>