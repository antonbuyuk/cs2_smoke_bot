<template>
  <div class="min-h-screen bg-slate-950 text-slate-50">
    <header class="border-b border-slate-800 bg-slate-900/70 backdrop-blur">
      <div class="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <h1 class="text-xl font-semibold tracking-tight">{{ title }}</h1>
        <div class="flex items-center gap-4">
          <button
            @click="showAddForm = true"
            class="rounded-md bg-sky-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-sky-700 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2 focus:ring-offset-slate-950"
          >
            + Add {{ itemName }}
          </button>
          <NuxtLink to="/settings" class="text-sm text-slate-400 hover:text-slate-200">
            ← Back to Settings
          </NuxtLink>
        </div>
      </div>
    </header>

    <main class="mx-auto max-w-6xl px-6 py-8">
      <!-- Форма добавления -->
      <section
        v-if="showAddForm"
        class="mb-6 rounded-lg border border-slate-800 bg-slate-900 p-6"
      >
        <div class="mb-4 flex items-center justify-between">
          <h2 class="text-lg font-semibold">Add New {{ itemName }}</h2>
          <button
            @click="closeAddForm"
            class="text-slate-400 hover:text-slate-200"
            type="button"
          >
            ✕
          </button>
        </div>

        <form @submit.prevent="handleAdd" class="space-y-4">
          <div>
            <label
              :for="`${itemNameLowercase}-name`"
              class="mb-2 block text-sm font-medium text-slate-300"
            >
              Name (Key) <span class="text-slate-500">*</span>
            </label>
            <input
              :id="`${itemNameLowercase}-name`"
              v-model="newItem.name"
              type="text"
              required
              :placeholder="namePlaceholder"
              class="w-full rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/40"
              pattern="[a-z0-9_]+"
              title="Use lowercase letters, numbers, and underscores only"
            />
            <p class="mt-1 text-xs text-slate-500">
              Lowercase letters, numbers, and underscores only (max 50 chars)
            </p>
          </div>

          <div>
            <label
              :for="`${itemNameLowercase}-display-name`"
              class="mb-2 block text-sm font-medium text-slate-300"
            >
              Display Name <span class="text-slate-500">*</span>
            </label>
            <input
              :id="`${itemNameLowercase}-display-name`"
              v-model="newItem.displayName"
              type="text"
              required
              :placeholder="displayNamePlaceholder"
              class="w-full rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/40"
              maxlength="100"
            />
            <p class="mt-1 text-xs text-slate-500">
              Human-readable name (max 100 chars)
            </p>
          </div>

          <div
            v-if="addError"
            class="rounded-md border border-rose-900/50 bg-rose-900/20 px-4 py-3 text-sm text-rose-200"
          >
            {{ addError }}
          </div>

          <div class="flex items-center gap-3">
            <button
              type="submit"
              :disabled="isAdding"
              class="rounded-md bg-sky-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-sky-700 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2 focus:ring-offset-slate-900 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span v-if="isAdding">Adding...</span>
              <span v-else>Add {{ itemName }}</span>
            </button>
            <button
              type="button"
              @click="closeAddForm"
              class="rounded-md border border-slate-700 bg-slate-800 px-4 py-2 text-sm font-medium text-slate-300 transition-colors hover:bg-slate-700"
            >
              Cancel
            </button>
          </div>
        </form>
      </section>

      <!-- Состояния загрузки и ошибок -->
      <section v-if="pending" class="grid h-48 place-items-center rounded-lg border border-slate-800 bg-slate-900">
        <span class="text-sm text-slate-400">Загружаем данные…</span>
      </section>

      <section
        v-else-if="error"
        class="rounded-lg border border-rose-900/50 bg-rose-900/20 px-4 py-3 text-rose-200"
      >
        {{ error.statusMessage ?? `Не удалось загрузить ${itemNamePluralLowercase}` }}
      </section>

      <!-- Таблица -->
      <section v-else class="overflow-x-auto rounded-lg border border-slate-800 bg-slate-900">
        <table class="w-full">
          <thead class="border-b border-slate-800 bg-slate-800/50">
            <tr>
              <th class="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-300">
                ID
              </th>
              <th class="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-300">
                Name (Key)
              </th>
              <th class="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-300">
                Display Name
              </th>
              <th class="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-300">
                Actions
              </th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-800">
            <tr
              v-for="item in items"
              :key="item.id"
              class="hover:bg-slate-800/30 transition-colors"
            >
              <td class="px-6 py-4 whitespace-nowrap text-sm text-slate-300">
                {{ item.id }}
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm font-mono text-slate-200">
                {{ item.name }}
              </td>
              <td class="px-6 py-4 text-sm text-slate-100">
                {{ item.display_name }}
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-right text-sm">
                <button
                  @click="handleDelete(item.id)"
                  :disabled="isDeleting(item.id)"
                  class="rounded-md border border-rose-700 bg-rose-900/20 px-3 py-1.5 text-xs font-medium text-rose-300 transition-colors hover:bg-rose-900/40 focus:outline-none focus:ring-2 focus:ring-rose-500 focus:ring-offset-2 focus:ring-offset-slate-900 disabled:opacity-50 disabled:cursor-not-allowed"
                  type="button"
                >
                  <span v-if="isDeleting(item.id)">Удаление...</span>
                  <span v-else>Удалить</span>
                </button>
              </td>
            </tr>
            <tr v-if="!items.length">
              <td colspan="4" class="px-6 py-8 text-center text-sm text-slate-400">
                {{ itemNamePlural }} не найдены
              </td>
            </tr>
          </tbody>
        </table>
      </section>

      <div
        v-if="deleteError"
        class="mt-4 rounded-md border border-rose-900/50 bg-rose-900/20 px-4 py-3 text-sm text-rose-200"
      >
        {{ deleteError }}
      </div>

      <div v-if="items.length" class="mt-4 text-sm text-slate-400">
        Всего {{ itemNamePluralLowercase }}: {{ items.length }}
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { useReferenceTable } from '~/composables/useReferenceTable';

type ReferenceRecord = {
  id: number;
  name: string;
  display_name: string;
};

type Props = {
  title: string;
  itemName: string;
  itemNamePlural: string;
  itemNameLowercase: string;
  itemNamePluralLowercase: string;
  apiPath: string;
  namePlaceholder: string;
  displayNamePlaceholder: string;
};

const props = defineProps<Props>();

const {
  items,
  pending,
  error,
  showAddForm,
  isAdding,
  addError,
  newItem,
  closeAddForm,
  handleAdd,
  handleDelete,
  isDeleting,
  deleteError,
} = await useReferenceTable<ReferenceRecord>({
  apiPath: props.apiPath,
  itemName: props.itemName,
  itemNamePlural: props.itemNamePlural,
  itemNameLowercase: props.itemNameLowercase,
});
</script>

