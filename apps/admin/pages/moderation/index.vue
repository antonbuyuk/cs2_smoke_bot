<script setup lang="ts">
import type { SmokeWithMap } from '@shared/utils/types';

const { data, refresh, pending } = await useFetch<{ data: SmokeWithMap[] }>('/api/grenades/pending');
const grenades = computed(() => data.value?.data ?? []);

const processingId = ref<number | null>(null);

const approve = async (id: number) => {
  processingId.value = id;
  try {
    await $fetch(`/api/grenades/${id}/approve`, { method: 'POST' });
    await refresh();
  } finally {
    processingId.value = null;
  }
};

const reject = async (id: number) => {
  processingId.value = id;
  try {
    await $fetch(`/api/grenades/${id}/reject`, { method: 'POST' });
    await refresh();
  } finally {
    processingId.value = null;
  }
};
</script>

<template>
  <div class="mod-page">
    <div class="mod-header">
      <h1 class="mod-title">Moderation</h1>
      <span v-if="grenades.length > 0" class="mod-count">{{ grenades.length }} pending</span>
    </div>

    <div v-if="pending" class="mod-loading">Loading...</div>

    <div v-else-if="grenades.length === 0" class="mod-empty">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" stroke-linecap="round" stroke-linejoin="round"/></svg>
      <p>No pending submissions</p>
    </div>

    <div v-else class="mod-grid">
      <div v-for="g in grenades" :key="g.id" class="mod-card">
        <div class="mod-card-head">
          <span class="mod-card-name">{{ g.name }}</span>
          <GrenadeTypeBadge :type="g.grenade_type" />
        </div>

        <div class="mod-card-meta">
          <span class="mod-meta-item">{{ g.map_display_name }}</span>
          <span class="mod-meta-sep">·</span>
          <span class="mod-meta-item mod-meta-upper">{{ g.side }}</span>
          <template v-if="g.line">
            <span class="mod-meta-sep">·</span>
            <span class="mod-meta-item">{{ g.line }}</span>
          </template>
          <span class="mod-meta-sep">·</span>
          <span class="mod-meta-item">{{ g.difficulty }}</span>
        </div>

        <p class="mod-card-instructions">{{ g.lineup_instructions }}</p>

        <div class="mod-card-actions">
          <button
            class="mod-btn mod-btn-approve"
            :disabled="processingId === g.id"
            @click="approve(g.id)"
          >
            Approve
          </button>
          <button
            class="mod-btn mod-btn-reject"
            :disabled="processingId === g.id"
            @click="reject(g.id)"
          >
            Reject
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.mod-page {
  max-width: 960px;
  margin: 0 auto;
  padding: 32px 18px;
}

.mod-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 24px;
}

.mod-title {
  font-size: 22px;
  font-weight: 700;
  color: var(--text-1);
  margin: 0;
}

.mod-count {
  background: color-mix(in oklab, var(--warning, #f59e0b) 15%, transparent);
  border: 1px solid color-mix(in oklab, var(--warning, #f59e0b) 30%, transparent);
  color: var(--warning, #f59e0b);
  font-size: 12px;
  font-weight: 600;
  border-radius: 20px;
  padding: 2px 10px;
}

.mod-loading {
  color: var(--text-3);
  padding: 40px 0;
  text-align: center;
  font-size: 14px;
}

.mod-empty {
  text-align: center;
  padding: 60px 0;
  color: var(--text-3);

  svg {
    width: 48px;
    height: 48px;
    margin-bottom: 12px;
    color: var(--text-3);
  }

  p {
    margin: 0;
    font-size: 15px;
  }
}

.mod-grid {
  display: grid;
  gap: 16px;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
}

.mod-card {
  background: var(--bg-1);
  border: 1px solid var(--line);
  border-radius: 12px;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.mod-card-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.mod-card-name {
  font-size: 15px;
  font-weight: 700;
  color: var(--text-1);
}

.mod-card-meta {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 4px;
  font-size: 12px;
}

.mod-meta-item {
  color: var(--text-2);
}

.mod-meta-upper {
  text-transform: uppercase;
}

.mod-meta-sep {
  color: var(--text-3);
}

.mod-card-instructions {
  font-size: 13px;
  color: var(--text-2);
  margin: 0;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
  line-height: 1.5;
}

.mod-card-actions {
  display: flex;
  gap: 8px;
  margin-top: 4px;
}

.mod-btn {
  flex: 1;
  padding: 7px 0;
  font-size: 13px;
  font-weight: 600;
  border-radius: 8px;
  border: none;
  cursor: pointer;
  transition: opacity 0.15s;

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  &-approve {
    background: color-mix(in oklab, #22c55e 18%, transparent);
    color: #22c55e;
    border: 1px solid color-mix(in oklab, #22c55e 30%, transparent);

    &:hover:not(:disabled) {
      background: color-mix(in oklab, #22c55e 28%, transparent);
    }
  }

  &-reject {
    background: color-mix(in oklab, #ef4444 15%, transparent);
    color: #ef4444;
    border: 1px solid color-mix(in oklab, #ef4444 25%, transparent);

    &:hover:not(:disabled) {
      background: color-mix(in oklab, #ef4444 25%, transparent);
    }
  }
}
</style>
