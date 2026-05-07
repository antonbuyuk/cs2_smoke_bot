<script setup lang="ts">
import type { ProgressStatus } from '@shared/utils/types';

defineProps<{
  status: ProgressStatus | null;
}>();

const { t } = useI18n();
</script>

<template>
  <span v-if="status" class="nd-status-badge" :class="`nd-status-${status}`">
    <span class="nd-status-dot" />
    {{ t(`flashcard.${status}`) }}
  </span>
</template>

<style lang="scss" scoped>
.nd-status-badge {
  --pcolor: var(--text-3);

  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 26px;
  padding: 0 10px;
  background: rgba(13,15,20,.78);
  backdrop-filter: blur(8px);
  border: 1px solid var(--pcolor);
  color: var(--pcolor);
  border-radius: 999px;
  font-size: 11px;
  font-family: 'JetBrains Mono', monospace;
  text-transform: uppercase;
  letter-spacing: .06em;
  font-weight: 600;
}

.nd-status-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--pcolor);
  box-shadow: 0 0 8px var(--pcolor);
}

.nd-status-want    { --pcolor: oklch(0.78 .17 80); }
.nd-status-learning { --pcolor: oklch(0.78 .17 220); }
.nd-status-learned  { --pcolor: oklch(0.78 .17 145); }
</style>
