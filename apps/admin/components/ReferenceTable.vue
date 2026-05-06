<template>
  <main class="page">
    <NuxtLink class="back-link" to="/settings">← Back to Settings</NuxtLink>

    <div class="page-head">
      <h1>{{ title }}</h1>
      <button class="btn-primary" @click="showAddForm = true">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>
        Add {{ itemName }}
      </button>
    </div>

    <StateBox v-if="pending" type="loading" :title="`Loading ${itemNamePluralLowercase}...`" />
    <StateBox v-else-if="error" type="error" :title="`Failed to load ${itemNamePluralLowercase}`" :description="error.statusMessage ?? error.message ?? `Could not load ${itemNamePluralLowercase}`" />
    <StateBox v-else-if="items.length === 0" type="empty" :title="`${itemNamePlural} not found`" :description="`Add your first ${itemNameLowercase} to get started.`" />

    <!-- Table -->
    <template v-else>
      <!-- Delete error -->
      <div v-if="deleteError" class="msg msg-warning" style="margin-bottom:16px">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
        {{ deleteError }}
        <button @click="clearDeleteError" style="margin-left:auto;background:none;border:none;color:var(--text-3);cursor:pointer;font-size:16px;">×</button>
      </div>

      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Name (Key)</th>
              <th>Display Name</th>
              <th style="text-align:right">Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in items" :key="item.id">
              <td class="td-id">{{ item.id }}</td>
              <td class="td-key">{{ item.name }}</td>
              <td>{{ item.display_name }}</td>
              <td class="td-actions">
                <button
                  class="btn-ghost btn-sm btn-danger"
                  :disabled="isDeleting(item.id)"
                  type="button"
                  @click="handleDelete(item.id)"
                >
                  <span v-if="isDeleting(item.id)" class="spinner-sm" />
                  {{ isDeleting(item.id) ? 'Deleting...' : 'Delete' }}
                </button>
              </td>
            </tr>
          </tbody>
        </table>
        <div class="table-foot">Total {{ itemNamePluralLowercase }}: {{ items.length }}</div>
      </div>
    </template>
  </main>

  <AppModal v-model="showAddForm" :title="`Add new ${itemName}`" modal-class="modal-sm" @closed="closeAddForm">
    <form @submit.prevent="handleAdd">
      <div class="field">
        <label>Name (Key) <span class="req">*</span></label>
        <input
          v-model="newItem.name"
          type="text"
          :placeholder="namePlaceholder"
          pattern="[a-z0-9_]+"
          title="Use lowercase letters, numbers, and underscores only"
        />
        <span class="hint">Lowercase letters, numbers, underscore only</span>
      </div>
      <div class="field">
        <label>Display Name <span class="req">*</span></label>
        <input
          v-model="newItem.displayName"
          type="text"
          :placeholder="displayNamePlaceholder"
          maxlength="100"
        />
        <span class="hint">Human-readable name (max 100 chars)</span>
      </div>
      <div v-if="addError" class="msg msg-error">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/></svg>
        {{ addError }}
      </div>
      <div class="form-foot">
        <button type="button" class="btn-ghost" @click="closeAddForm">Cancel</button>
        <button type="submit" class="btn-primary" :disabled="isAdding">
          <span v-if="isAdding" class="spinner-sm" />
          {{ isAdding ? 'Adding...' : `Add ${itemName}` }}
        </button>
      </div>
    </form>
  </AppModal>
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

// Используем композабл без await, так как он сам обрабатывает async логику
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
} = useReferenceTable<ReferenceRecord>({
  apiPath: props.apiPath,
  itemName: props.itemName,
  itemNamePlural: props.itemNamePlural,
  itemNameLowercase: props.itemNameLowercase,
});

const clearDeleteError = () => { deleteError.value = null; };
</script>

<style lang="scss" scoped>
@use '~/assets/styles/mixins' as *;

.table-wrap {
  background: var(--bg-1);
  border: 1px solid var(--line);
  border-radius: var(--radius);
  overflow: hidden;
  margin-bottom: 16px;
}

table { width: 100%; border-collapse: collapse; }

th {
  font-family: 'JetBrains Mono', monospace;
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: .08em;
  color: var(--text-3);
  text-align: left;
  padding: 14px 18px;
  border-bottom: 1px solid var(--line);
  background: var(--bg-2);
  font-weight: 500;

  @include respond-to(640) { padding: 10px 12px; font-size: 13px; }

  &:first-child {
    @include respond-to(640) { display: none; }
  }
}

td {
  padding: 12px 18px;
  border-bottom: 1px solid var(--line);
  font-size: 14px;
  vertical-align: middle;

  @include respond-to(640) { padding: 10px 12px; font-size: 13px; }
}

tr {
  &:last-child td { border-bottom: none; }
  &:hover td { background: var(--bg-2); }
}

.td-id {
  font-family: 'JetBrains Mono', monospace;
  font-size: 12px;
  color: var(--text-3);
  width: 60px;

  @include respond-to(640) { display: none; }
}

.td-key { font-family: 'JetBrains Mono', monospace; font-size: 13px; color: var(--accent); }
.td-actions { width: 120px; text-align: right; }

.table-foot {
  padding: 12px 18px;
  font-family: 'JetBrains Mono', monospace;
  font-size: 11px;
  color: var(--text-3);
  border-top: 1px solid var(--line);
  background: var(--bg-2);
}

</style>
