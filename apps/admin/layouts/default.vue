<script setup lang="ts">
const { user, isAuthenticated, isAdmin, logout } = useAuth();
const { theme, toggleTheme } = useTheme();
const route = useRoute();

const handleLogout = async () => {
  await logout();
};

const userInitials = computed(() => {
  if (!user.value) return '?';
  const f = user.value.firstName?.[0] ?? '';
  const l = user.value.lastName?.[0] ?? '';
  return ((f + l).toUpperCase() || user.value.username?.[0]?.toUpperCase()) ?? '?';
});

const isActive = (path: string) => {
  if (path === '/') return route.path === '/';
  return route.path.startsWith(path);
};
</script>

<template>
  <div class="lyt-app">
    <header class="lyt-header">
      <div class="lyt-header-inner">
        <!-- Brand -->
        <NuxtLink to="/" class="lyt-brand">
          <span class="lyt-brand-mark">N</span>
          <span class="lyt-brand-name">nade<span>.map</span></span>
        </NuxtLink>

        <!-- Nav links -->
        <nav class="lyt-nav">
          <NuxtLink to="/" :class="['lyt-nav-link', { active: isActive('/') }]">Home</NuxtLink>
          <NuxtLink to="/grenades" :class="['lyt-nav-link', { active: isActive('/grenades') }]">Lineups</NuxtLink>
          <NuxtLink v-if="isAdmin" to="/moderation" :class="['lyt-nav-link', { active: isActive('/moderation') }]">Moderation</NuxtLink>
          <NuxtLink v-if="isAdmin" to="/users" :class="['lyt-nav-link', { active: isActive('/users') }]">Users</NuxtLink>
          <NuxtLink v-if="isAdmin" to="/settings" :class="['lyt-nav-link', { active: isActive('/settings') }]">Settings</NuxtLink>
        </nav>

        <div class="lyt-spacer" />

        <!-- Actions -->
        <div class="lyt-actions">
          <!-- Theme toggle -->
          <button class="lyt-icon-btn" :title="theme === 'dark' ? 'Light mode' : 'Dark mode'" @click="toggleTheme">
            <svg v-if="theme === 'dark'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/></svg>
            <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
          </button>

          <!-- New lineup button — only for authenticated users -->
          <NuxtLink v-if="isAuthenticated" to="/grenades" class="lyt-btn-primary">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>
            <span class="lyt-label">New lineup</span>
          </NuxtLink>

          <!-- User avatar -->
          <div v-if="user" class="lyt-avatar" :title="user.firstName">
            {{ userInitials }}
          </div>
        </div>
      </div>
    </header>

    <!-- Mobile search row -->
    <div class="lyt-mobile-search">
      <div class="lyt-mobile-search-inner">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>
        <input placeholder="Search..." />
      </div>
    </div>

    <!-- Page content -->
    <slot />
  </div>
</template>

<style lang="scss" scoped>
@use '~/assets/styles/mixins' as *;

.lyt-app {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.lyt-header {
  position: sticky;
  top: 0;
  z-index: 40;
  background: color-mix(in oklab, var(--bg-0) 88%, transparent);
  backdrop-filter: saturate(140%) blur(12px);
  -webkit-backdrop-filter: saturate(140%) blur(12px);
  border-bottom: 1px solid var(--line);

  &-inner {
    max-width: 1480px;
    margin: 0 auto;
    padding: 14px 18px;
    display: flex;
    align-items: center;
    gap: 14px;

    @include respond-to(600) { padding: 12px 14px; gap: 8px; }
  }
}

.lyt-brand {
  display: flex;
  align-items: center;
  gap: 10px;
  font-weight: 700;
  letter-spacing: 0.02em;
  font-size: 17px;
  text-decoration: none;
  color: var(--text-1);

  &-mark {
    width: 28px;
    height: 28px;
    border-radius: 7px;
    background: linear-gradient(135deg, var(--accent), oklch(0.66 0.18 200));
    display: grid;
    place-items: center;
    color: var(--accent-ink);
    font-family: 'JetBrains Mono', monospace;
    font-weight: 700;
    font-size: 13px;
    box-shadow: 0 0 0 1px var(--line-strong), 0 0 24px var(--accent-glow);
  }

  &-name span { color: var(--accent); }
}

.lyt-nav {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-left: 8px;

  @include respond-to(600) { display: none; }

  &-link {
    padding: 8px 12px;
    font-size: 14px;
    color: var(--text-2);
    text-decoration: none;
    border-radius: 8px;
    transition: all 0.15s;

    &:hover { color: var(--text-1); background: var(--bg-2); }
    &.active { color: var(--accent); background: var(--accent-soft); }

    @include respond-to(860) { padding: 6px 10px; font-size: 13px; }
  }
}

.lyt-spacer { flex: 1; }

.lyt-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.lyt-icon-btn {
  width: 40px;
  height: 40px;
  display: grid;
  place-items: center;
  background: var(--bg-2);
  border: 1px solid var(--line);
  border-radius: 10px;
  color: var(--text-2);
  transition: all 0.15s;

  &:hover { border-color: var(--line-strong); color: var(--text-1); }
  svg { width: 18px; height: 18px; }
}

.lyt-btn-primary {
  height: 40px;
  padding: 0 16px;
  background: var(--accent);
  color: var(--accent-ink);
  border: none;
  border-radius: 10px;
  font-weight: 600;
  font-size: 14px;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  text-decoration: none;
  transition: transform 0.1s, box-shadow 0.15s;
  box-shadow: 0 0 0 1px var(--accent), 0 8px 24px var(--accent-glow);

  &:hover { transform: translateY(-1px); box-shadow: 0 0 0 1px var(--accent), 0 12px 32px var(--accent-glow); }
  &:active { transform: translateY(0); }
  svg { width: 16px; height: 16px; }

  .lyt-label {
    @include respond-to(860) { display: none; }
  }
}

.lyt-avatar {
  width: 36px;
  height: 36px;
  border-radius: 10px;
  background: linear-gradient(135deg, var(--magenta), var(--accent));
  color: white;
  display: grid;
  place-items: center;
  font-weight: 700;
  font-size: 13px;
  border: 1px solid var(--line);
  font-family: 'JetBrains Mono', monospace;

  @include respond-to(600) { display: none; }
}

.lyt-mobile-search {
  display: none;

  @include respond-to(600) {
    display: block;
    padding: 0 18px 12px;
    background: var(--bg-0);
    border-bottom: 1px solid var(--line);
  }

  &-inner {
    position: relative;
    display: flex;
    align-items: center;
  }

  input {
    width: 100%;
    height: 38px;
    padding: 0 14px 0 36px;
    background: var(--bg-2);
    border: 1px solid var(--line);
    border-radius: 10px;
    color: var(--text-1);
    outline: none;
    font-size: 14px;
  }

  svg {
    position: absolute;
    left: 12px;
    width: 16px;
    height: 16px;
    color: var(--text-3);
    pointer-events: none;
  }
}
</style>
