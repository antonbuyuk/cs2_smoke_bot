<script setup lang="ts">
const props = defineProps<{
  typeName: string
  displayName: string
  variant?: 'card' | 'pill' | 'simple'
}>();

const { getTypeColorVar } = useGrenadeTypeColor();
const colorVar = computed(() => getTypeColorVar(props.typeName));
</script>

<template>
  <span
    v-if="!variant || variant === 'card'"
    class="nd-gt-badge"
    :style="{ '--gt-color': `var(${colorVar})` }"
  >
    <span class="nd-gt-dot" />{{ displayName }}
  </span>

  <span
    v-else-if="variant === 'pill'"
    class="nd-gt-pill"
    :style="{
      '--gt-color': `var(${colorVar})`,
      '--gt-color-soft': `var(${colorVar} / 0.15)`,
    }"
  >
    <span class="nd-gt-dot" />{{ displayName }}
  </span>

  <span
    v-else-if="variant === 'simple'"
    class="badge"
    :style="{ '--badge-color': `var(${colorVar})` }"
  >
    <span class="bdot" />{{ displayName }}
  </span>
</template>

<style lang="scss" scoped>
// card variant
.nd-gt-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 26px;
  padding: 0 10px;
  background: rgba(13,15,20,.78);
  backdrop-filter: blur(8px);
  border: 1px solid var(--gt-color, var(--line-strong));
  color: var(--gt-color, var(--text-1));
  border-radius: 999px;
  font-size: 11px;
  font-family: 'JetBrains Mono', monospace;
  text-transform: uppercase;
  letter-spacing: .06em;
  font-weight: 600;
}

// pill variant
.nd-gt-pill {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 3px 8px;
  border-radius: 4px;
  background: color-mix(in oklab, var(--gt-color, var(--accent)) 15%, transparent);
  color: var(--gt-color, var(--accent));
  border: 1px solid var(--gt-color, var(--accent));
}

.nd-gt-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--gt-color, var(--accent));
  box-shadow: 0 0 8px var(--gt-color, var(--accent));
}

.nd-gt-pill .nd-gt-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: currentColor;
  box-shadow: none;
}
</style>
