<script setup lang="ts">
import { ref } from 'vue';
import type { ProgressStatus } from '@shared/utils/types';

const props = defineProps<{
  granadeId: number;
}>();

const { t } = useI18n();
const { statusOf, setStatus, clearStatus } = useProgress();

const pending = ref<ProgressStatus | 'clear' | null>(null);

const STATUSES: ProgressStatus[] = ['want', 'learning', 'learned'];

const onPick = async (status: ProgressStatus) => {
  if (pending.value) return;
  const current = statusOf(props.granadeId);
  pending.value = status;
  try {
    if (current === status) {
      pending.value = 'clear';
      await clearStatus(props.granadeId);
    } else {
      await setStatus(props.granadeId, status);
    }
  } catch (error) {
    console.error('Progress update failed:', error);
  } finally {
    pending.value = null;
  }
};
</script>

<template>
  <div class="nd-progress-switch" role="group">
    <button
      v-for="s in STATUSES"
      :key="s"
      type="button"
      class="nd-progress-btn"
      :class="[`nd-progress-${s}`, { active: statusOf(granadeId) === s, busy: pending === s }]"
      :disabled="!!pending"
      @click="onPick(s)"
    >
      <span class="nd-progress-dot" />
      {{ t(`flashcard.${s}`) }}
    </button>
  </div>
</template>

<style lang="scss" scoped>
.nd-progress-switch {
  display: inline-flex;
  gap: 6px;
  flex-wrap: wrap;
}

.nd-progress-btn {
  --pcolor: var(--text-3);

  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 30px;
  padding: 0 12px;
  background: var(--bg-2);
  border: 1px solid var(--line);
  color: var(--text-2);
  border-radius: 999px;
  font-size: 12px;
  font-family: 'JetBrains Mono', monospace;
  text-transform: uppercase;
  letter-spacing: .06em;
  cursor: pointer;
  transition: all .15s;
}

.nd-progress-btn:hover:not(:disabled) {
  color: var(--text-1);
  border-color: var(--pcolor);
}

.nd-progress-btn.active {
  background: color-mix(in oklab, var(--pcolor) 15%, transparent);
  border-color: var(--pcolor);
  color: var(--pcolor);
}

.nd-progress-btn:disabled { opacity: .55; cursor: progress; }
.nd-progress-btn.busy { opacity: .8; }

.nd-progress-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--pcolor);
  box-shadow: 0 0 6px var(--pcolor);
}

.nd-progress-want    { --pcolor: oklch(0.78 .17 80); }   /* amber */
.nd-progress-learning { --pcolor: oklch(0.78 .17 220); } /* blue */
.nd-progress-learned  { --pcolor: oklch(0.78 .17 145); } /* green */
</style>
