<script setup lang="ts">
const { user, isAuthenticated, logout, fetchUser } = useAuth();

onMounted(async () => {
  await fetchUser();
});

const handleLogout = async () => {
  await logout();
};
</script>

<template>
  <div class="flex flex-col min-h-screen bg-slate-950 text-slate-50">
    <header v-if="isAuthenticated" class="border-b border-slate-800 bg-slate-900/70 backdrop-blur sticky top-0 z-50">
      <div class="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <NuxtLink to="/" class="text-xl font-semibold tracking-tight hover:text-sky-400 transition-colors">
          CS2 Bot Admin
        </NuxtLink>

        <nav class="flex items-center gap-6">
          <NuxtLink
            to="/smokes"
            class="text-sm text-slate-400 hover:text-slate-200 transition-colors"
            active-class="text-sky-400 font-medium"
          >
            Smokes
          </NuxtLink>
          <NuxtLink
            to="/settings"
            class="text-sm text-slate-400 hover:text-slate-200 transition-colors"
            active-class="text-sky-400 font-medium"
          >
            Settings
          </NuxtLink>

          <div class="flex items-center gap-4 pl-6 border-l border-slate-800">
            <div v-if="user" class="flex items-center gap-3">
              <img
                v-if="user.photoUrl"
                :src="user.photoUrl"
                :alt="user.firstName"
                class="w-8 h-8 rounded-full"
              />
              <div class="text-sm">
                <p class="text-slate-200">{{ user.firstName }} {{ user.lastName || '' }}</p>
                <p class="text-xs text-slate-500">@{{ user.username }}</p>
              </div>
            </div>
            <button
              @click="handleLogout"
              class="px-4 py-2 text-sm bg-slate-800 hover:bg-slate-700 rounded-md transition-colors"
            >
              Logout
            </button>
          </div>
        </nav>
      </div>
    </header>

    <main class="grow">
      <nuxt-page />
    </main>
  </div>
</template>

<style lang="scss" scoped>
</style>
