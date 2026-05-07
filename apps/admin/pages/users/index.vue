<script setup lang="ts">
import type { UserRecord } from '@shared/utils/types';

const { user: currentUser } = useAuth();

const { data, refresh } = await useFetch<{ data: UserRecord[] }>('/api/users');
const users = computed(() => data.value?.data ?? []);

const updatingId = ref<number | null>(null);

const changeRole = async (telegramId: number, role: 'admin' | 'user') => {
  updatingId.value = telegramId;
  try {
    await $fetch(`/api/users/${telegramId}`, {
      method: 'PATCH',
      body: { role },
    });
    await refresh();
  } catch (error: any) {
    console.error('Failed to update role:', error);
  } finally {
    updatingId.value = null;
  }
};

const formatDate = (dateStr: string) => {
  return new Date(dateStr).toLocaleDateString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
};
</script>

<template>
  <div class="users-page">
    <div class="users-header">
      <h1 class="users-title">Users</h1>
      <span class="users-count">{{ users.length }}</span>
    </div>

    <div v-if="users.length === 0" class="users-empty">
      No users yet.
    </div>

    <div v-else class="users-table-wrap">
      <table class="users-table">
        <thead>
          <tr>
            <th>User</th>
            <th>Telegram ID</th>
            <th>Role</th>
            <th>Joined</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="u in users" :key="u.telegramId">
            <td class="users-cell-name">
              <span class="users-name">{{ u.firstName }}{{ u.lastName ? ' ' + u.lastName : '' }}</span>
              <span v-if="u.username" class="users-username">@{{ u.username }}</span>
            </td>
            <td class="users-cell-id">{{ u.telegramId }}</td>
            <td class="users-cell-role">
              <template v-if="String(u.telegramId) === currentUser?.id">
                <span :class="['users-role-badge', u.role]">{{ u.role }}</span>
                <span class="users-self-note">(you)</span>
              </template>
              <template v-else>
                <div class="users-role-switcher">
                  <button
                    :class="['users-role-btn', { active: u.role === 'user' }]"
                    :disabled="updatingId === u.telegramId"
                    @click="changeRole(u.telegramId, 'user')"
                  >
                    User
                  </button>
                  <button
                    :class="['users-role-btn', { active: u.role === 'admin' }]"
                    :disabled="updatingId === u.telegramId"
                    @click="changeRole(u.telegramId, 'admin')"
                  >
                    Admin
                  </button>
                </div>
              </template>
            </td>
            <td class="users-cell-date">{{ formatDate(u.createdAt) }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.users-page {
  max-width: 960px;
  margin: 0 auto;
  padding: 32px 18px;
}

.users-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 24px;
}

.users-title {
  font-size: 22px;
  font-weight: 700;
  color: var(--text-1);
  margin: 0;
}

.users-count {
  background: var(--bg-2);
  border: 1px solid var(--line);
  color: var(--text-2);
  font-size: 13px;
  font-weight: 600;
  border-radius: 20px;
  padding: 2px 10px;
}

.users-empty {
  color: var(--text-3);
  font-size: 14px;
  padding: 40px 0;
  text-align: center;
}

.users-table-wrap {
  overflow-x: auto;
  border: 1px solid var(--line);
  border-radius: 12px;
}

.users-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 14px;

  th {
    text-align: left;
    padding: 10px 16px;
    color: var(--text-3);
    font-weight: 600;
    font-size: 12px;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    border-bottom: 1px solid var(--line);
    background: var(--bg-1);
  }

  td {
    padding: 12px 16px;
    border-bottom: 1px solid var(--line);
    vertical-align: middle;
  }

  tr:last-child td {
    border-bottom: none;
  }

  tr:hover td {
    background: var(--bg-1);
  }
}

.users-cell-name {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.users-name {
  font-weight: 600;
  color: var(--text-1);
}

.users-username {
  color: var(--text-3);
  font-size: 12px;
}

.users-cell-id {
  color: var(--text-3);
  font-family: 'JetBrains Mono', monospace;
  font-size: 12px;
}

.users-cell-date {
  color: var(--text-3);
  font-size: 13px;
}

.users-role-badge {
  font-size: 12px;
  font-weight: 600;
  padding: 3px 10px;
  border-radius: 6px;
  text-transform: capitalize;

  &.admin {
    background: color-mix(in oklab, var(--accent) 15%, transparent);
    color: var(--accent);
    border: 1px solid color-mix(in oklab, var(--accent) 30%, transparent);
  }

  &.user {
    background: var(--bg-2);
    color: var(--text-2);
    border: 1px solid var(--line);
  }
}

.users-self-note {
  color: var(--text-3);
  font-size: 12px;
  margin-left: 6px;
}

.users-role-switcher {
  display: flex;
  gap: 4px;
}

.users-role-btn {
  padding: 4px 12px;
  font-size: 12px;
  font-weight: 600;
  border-radius: 6px;
  border: 1px solid var(--line);
  background: var(--bg-2);
  color: var(--text-2);
  cursor: pointer;
  transition: all 0.15s;

  &:hover:not(:disabled) {
    border-color: var(--line-strong);
    color: var(--text-1);
  }

  &.active {
    background: color-mix(in oklab, var(--accent) 15%, transparent);
    color: var(--accent);
    border-color: color-mix(in oklab, var(--accent) 30%, transparent);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
}
</style>
