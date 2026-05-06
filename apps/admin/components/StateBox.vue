<script setup lang="ts">
defineProps<{
  type: 'loading' | 'error' | 'empty'
  title: string
  description?: string
}>();
</script>

<template>
  <div
    class="state-box"
    :style="type === 'error' ? { borderColor: 'var(--red)' } : {}"
  >
    <div v-if="type === 'loading'" class="spinner" />
    <h3 :style="type === 'error' ? { color: 'var(--red)' } : {}">{{ title }}</h3>
    <p v-if="description">{{ description }}</p>
    <slot />
  </div>
</template>
