<script setup lang="ts">
import type { SmokeMediaRecord } from '@shared/utils/types';

const props = defineProps<{
  media: SmokeMediaRecord[]
  loading?: boolean
  coverFileId?: string
  placeholderText?: string
}>();

const currentIndex = ref(0);

watch(() => props.media, () => {
  currentIndex.value = 0;
});

const currentMedia = computed(() => props.media[currentIndex.value] ?? null);
const hasMultiple = computed(() => props.media.length > 1);

const buildMediaUrl = (fileId: string) => {
  const clean = fileId.startsWith('/') ? fileId.slice(1) : fileId;
  return `/api/media/${encodeURIComponent(clean)}`;
};
</script>

<template>
  <div class="gallery-main">
    <!-- Media loaded -->
    <template v-if="currentMedia">
      <img
        v-if="currentMedia.media_type === 'photo'"
        :src="buildMediaUrl(currentMedia.file_id)"
        alt=""
        class="gallery-img"
      />
      <video
        v-else
        :src="buildMediaUrl(currentMedia.file_id)"
        controls
        class="gallery-video"
      />
      <div v-if="hasMultiple" class="gallery-nav">
        <button class="gallery-nav-btn" :disabled="currentIndex === 0" @click="currentIndex--">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M15 18l-6-6 6-6"/></svg>
        </button>
        <span class="gallery-nav-count">{{ currentIndex + 1 }} / {{ media.length }}</span>
        <button class="gallery-nav-btn" :disabled="currentIndex === media.length - 1" @click="currentIndex++">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M9 18l6-6-6-6"/></svg>
        </button>
      </div>
    </template>

    <!-- Loading: show cover as fallback -->
    <template v-else-if="loading && coverFileId">
      <img :src="buildMediaUrl(coverFileId)" alt="" class="gallery-img" />
    </template>

    <!-- No media placeholder -->
    <template v-else-if="!loading">
      <div class="gallery-ph">
        <span class="gallery-ph-label">{{ placeholderText }}</span>
      </div>
    </template>
  </div>

  <!-- Thumbnail strip -->
  <div v-if="media.length > 1" class="gallery-thumbs">
    <button
      v-for="(item, i) in media"
      :key="item.id"
      class="gallery-thumb"
      :class="{ active: i === currentIndex }"
      @click="currentIndex = i"
    >
      <img v-if="item.media_type === 'photo'" :src="buildMediaUrl(item.file_id)" alt="" />
      <span v-else class="gallery-thumb-video">
        <svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
      </span>
    </button>
  </div>
</template>

<style lang="scss" scoped>
.gallery-main {
  flex: 1;
  position: relative;
  overflow: hidden;
}

.gallery-img {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.gallery-video {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: contain;
  background: #000;
}

.gallery-ph {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  font-family: 'JetBrains Mono', monospace;
  font-size: 12px;
  color: var(--text-3);
  letter-spacing: .1em;
  text-transform: uppercase;
  background: repeating-linear-gradient(45deg, var(--bg-1) 0 14px, var(--bg-2) 14px 28px);
}

.gallery-ph-label {
  position: relative;
  background: rgba(0,0,0,.55);
  padding: 6px 12px;
  border-radius: 6px;
  border: 1px solid var(--line-strong);
}

.gallery-nav {
  position: absolute;
  bottom: 14px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  gap: 8px;
  background: rgba(13, 15, 20, .82);
  backdrop-filter: blur(8px);
  border: 1px solid var(--line-strong);
  border-radius: 999px;
  padding: 4px 8px 4px 4px;
  z-index: 5;
}

.gallery-nav-btn {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  border: none;
  background: transparent;
  color: var(--text-1);
  display: grid;
  place-items: center;
  transition: background .12s;

  &:hover:not(:disabled) { background: rgba(255,255,255,.1); }
  &:disabled { opacity: .3; }
  svg { width: 14px; height: 14px; }
}

.gallery-nav-count {
  font-family: 'JetBrains Mono', monospace;
  font-size: 11px;
  color: var(--text-2);
  min-width: 32px;
  text-align: center;
}

.gallery-thumbs {
  display: flex;
  gap: 6px;
  padding: 10px 12px;
  background: var(--bg-0);
  border-top: 1px solid var(--line);
  overflow-x: auto;
  scrollbar-width: none;
  &::-webkit-scrollbar { display: none; }
}

.gallery-thumb {
  flex-shrink: 0;
  width: 56px;
  height: 40px;
  border-radius: 6px;
  border: 2px solid transparent;
  overflow: hidden;
  background: var(--bg-2);
  cursor: pointer;
  transition: border-color .15s, opacity .15s;
  padding: 0;
  opacity: .55;

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
  }

  &:hover { opacity: .85; }
  &.active { border-color: var(--accent); opacity: 1; }
}

.gallery-thumb-video {
  width: 100%;
  height: 100%;
  display: grid;
  place-items: center;
  color: var(--text-2);
  svg { width: 16px; height: 16px; }
}
</style>
