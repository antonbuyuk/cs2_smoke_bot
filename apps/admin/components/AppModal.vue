<script setup lang="ts">
defineProps<{
  modelValue: boolean
  title: string
  modalClass?: string
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', value: false): void
  (e: 'closed'): void
}>();

const close = () => {
  emit('update:modelValue', false);
  emit('closed');
};
</script>

<template>
  <Teleport to="body">
    <div v-if="modelValue" class="overlay" @click.self="close">
      <div class="modal" :class="modalClass">
        <div class="modal-header">
          <h2>{{ title }}</h2>
          <button type="button" class="modal-close" @click="close">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round">
              <path d="M6 6l12 12M18 6L6 18"/>
            </svg>
          </button>
        </div>
        <div class="modal-body">
          <slot />
        </div>
      </div>
    </div>
  </Teleport>
</template>
