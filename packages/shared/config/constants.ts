import type { KeyboardOption } from '@shared/utils/types';
import {
  getMapEmoji as getMapEmojiFromEmojis,
  getGrenadeTypeEmoji as getGrenadeTypeEmojiFromEmojis,
  getDifficultyEmoji as getDifficultyEmojiFromEmojis,
  getSideEmoji as getSideEmojiFromEmojis,
  getLineEmoji as getLineEmojiFromEmojis,
} from './emojis';

type KeyboardDictionary = Record<string, KeyboardOption>;

const hasDictionaryKey = <T extends Record<string, unknown>>(dictionary: T, key: string): key is keyof T & string => {
  return Object.prototype.hasOwnProperty.call(dictionary, key);
};

// Функция для создания клавиатуры из данных БД
export const createKeyboardFromDB = <T extends { name: string; display_name: string }>(
  prefix: string,
  items: T[],
  emojiMap: Record<string, string>,
  includeAll: boolean = false
) => {
  const keyboardItems = items.map((item) => ({
    text: `${emojiMap[item.name] ?? '📋'} ${item.display_name}`,
    callback_data: `${prefix}_${item.name}`,
  }));

  if (includeAll) {
    keyboardItems.unshift({
      text: `${emojiMap.all ?? '📋'} All`,
      callback_data: `${prefix}_all`,
    });
  }

  return {
    inline_keyboard: keyboardItems.map((item) => [item]),
  };
};

// Функция для создания клавиатуры (старая версия для обратной совместимости)
export const createKeyboard = (prefix: string, options: KeyboardDictionary) => ({
  inline_keyboard: Object.entries(options).map(([, value]) => ([{
    text: `${value.emoji} ${value.name}`,
    callback_data: `${prefix}_${value.callback}`
  }]))
});

// Константы удалены - данные теперь хранятся в БД
// Используйте функции из @shared/database для получения данных
// Эмодзи хранятся в @shared/config/emojis

// Функции форматирования (deprecated - данные теперь в БД)
// Оставлены для обратной совместимости
// Используйте данные из БД напрямую (display_name)
export const getMapName = (_mapName: string) => undefined;
export const getMapEmoji = (mapName: string) => getMapEmojiFromEmojis(mapName);

// Функция для получения эмодзи типа гранаты
export const getGrenadeTypeEmoji = (grenadeType: string) => getGrenadeTypeEmojiFromEmojis(grenadeType);

// Функция для получения названия типа гранаты (deprecated - используйте данные из БД)
export const getGrenadeTypeName = (_grenadeType: string) => undefined;

// Функция для получения эмодзи сложности
export const getDifficultyEmoji = (difficulty: string) => getDifficultyEmojiFromEmojis(difficulty);

// Функция для получения названия сложности (deprecated - используйте данные из БД)
export const getDifficultyName = (_difficulty: string) => undefined;

export const getSideEmoji = (side: string) => getSideEmojiFromEmojis(side);
export const getSideName = (_side: string) => undefined;

export const getLineEmoji = (line: string) => getLineEmojiFromEmojis(line);
export const getLineName = (_line: string) => undefined;

// Константы для действий админа
export const ADMIN_ACTIONS = {
  approve: {

    emoji: '✅',
    name: 'Approve',
    callback: 'approve'
  },
  reject: {
    emoji: '❌',
    name: 'Reject',
    callback: 'reject'
  },
  edit: {
    emoji: '✏️',
    name: 'Edit',
    callback: 'edit'
  },
  delete: {
    emoji: '🗑️',
    name: 'Delete',
    callback: 'delete'
  },
  view: {
    emoji: '👁️',
    name: 'View',
    callback: 'view'
  }
} as const satisfies KeyboardDictionary;

// Функция для получения эмодзи действия админа
export const getAdminActionEmoji = (action: string) => {
  return hasDictionaryKey(ADMIN_ACTIONS, action) ? ADMIN_ACTIONS[action].emoji : '⚙️';
};

// Функция для получения названия действия админа
export const getAdminActionName = (action: string) => {
  return hasDictionaryKey(ADMIN_ACTIONS, action) ? ADMIN_ACTIONS[action].name : 'Action';
};

// Функция для создания клавиатуры действий админа
const defaultAdminActions: (keyof typeof ADMIN_ACTIONS)[] = ['approve', 'reject', 'edit'];

export const createAdminActionKeyboard = (prefix: string, actions: (keyof typeof ADMIN_ACTIONS)[] = defaultAdminActions) => {
  return {
    inline_keyboard: actions.map(action => ([{
      text: `${ADMIN_ACTIONS[action].emoji} ${ADMIN_ACTIONS[action].name}`,
      callback_data: `${prefix}_${action}_`
    }]))
  };
};

// Функция для безопасного экранирования Markdown
export const escapeMarkdown = (text: string) => {
  if (!text) return '';
  return text
    .replace(/_/g, '\\_')
    .replace(/\*/g, '\\*')
    .replace(/\[/g, '\\[')
    .replace(/\]/g, '\\]')
    .replace(/`/g, '\\`')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)')
    .replace(/#/g, '\\#')
    .replace(/\+/g, '\\+')
    .replace(/-/g, '\\-')
    .replace(/=/g, '\\=')
    .replace(/\|/g, '\\|')
    .replace(/\{/g, '\\{')
    .replace(/\}/g, '\\}')
    .replace(/\./g, '\\.')
    .replace(/!/g, '\\!');
};

// Типы экспортируются из guards.ts
// Оставляем только AdminActionKey, так как он относится к ADMIN_ACTIONS
export type AdminActionKey = keyof typeof ADMIN_ACTIONS;