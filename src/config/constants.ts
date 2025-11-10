import type { KeyboardOption } from '../utils/types';

type KeyboardDictionary = Record<string, KeyboardOption>;

const hasDictionaryKey = <T extends Record<string, unknown>>(dictionary: T, key: string): key is keyof T & string => {
  return Object.prototype.hasOwnProperty.call(dictionary, key);
};

// Функция для создания клавиатуры
export const createKeyboard = (prefix: string, options: KeyboardDictionary) => ({
  inline_keyboard: Object.entries(options).map(([, value]) => ([{
    text: `${value.emoji} ${value.name}`,
    callback_data: `${prefix}_${value.callback}`
  }]))
});

// Константы для карт
export const MAP_TYPES = {
  ancient: {
    callback: 'ancient',
    name: 'Ancient',
    emoji: '🏛️'
  },
  dust2: {
    callback: 'dust2',
    name: 'Dust 2',
    emoji: '🏜️'
  },
  mirage: {
    callback: 'mirage',
    name: 'Mirage',
    emoji: '🏙️'
  },
  inferno: {
    callback: 'inferno',
    name: 'Inferno',
    emoji: '🔥'
  },
  overpass: {
    callback: 'overpass',
    name: 'Overpass',
    emoji: '🌉'
  },
  nuke: {
    callback: 'nuke',
    name: 'Nuke',
    emoji: '☢️'
  },
  vertigo: {
    callback: 'vertigo',
    name: 'Vertigo',
    emoji: '🏗️'
  },
  all: {
    callback: 'all',
    name: 'All maps',
    emoji: '📋'
  }
} as const satisfies KeyboardDictionary;

export const getMapName = (mapName: string) => hasDictionaryKey(MAP_TYPES, mapName) ? MAP_TYPES[mapName].name : undefined;
export const getMapEmoji = (mapName: string) => hasDictionaryKey(MAP_TYPES, mapName) ? MAP_TYPES[mapName].emoji : undefined;


// Константы для типов гранат
export const GRENADE_TYPES = {
  smoke: {
    emoji: '💨',
    name: 'Smoke',
    callback: 'smoke'
  },
  flash: {
    emoji: '⚡',
    name: 'Flash',
    callback: 'flash'
  },
  he: {
    emoji: '💥',
    name: 'HE',
    callback: 'he'
  },
  molotov: {
    emoji: '🔥',
    name: 'Molotov',
    callback: 'molotov'
  },
  decoy: {
    emoji: '🎭',
    name: 'Decoy',
    callback: 'decoy'
  },
  all: {
    emoji: '📋',
    name: 'All types',
    callback: 'all'
  }
} as const satisfies KeyboardDictionary;

// Функция для получения эмодзи типа гранаты
export const getGrenadeTypeEmoji = (grenadeType: string) => hasDictionaryKey(GRENADE_TYPES, grenadeType)
  ? GRENADE_TYPES[grenadeType].emoji
  : '💨';

// Функция для получения названия типа гранаты
export const getGrenadeTypeName = (grenadeType: string) => hasDictionaryKey(GRENADE_TYPES, grenadeType)
  ? GRENADE_TYPES[grenadeType].name
  : 'Smoke';

// Константы для сложности
export const DIFFICULTY_LEVELS = {
  easy: {
    emoji: '🟢',
    name: 'Easy',
    callback: 'easy'
  },
  medium: {
    emoji: '🟡',
    name: 'Medium',
    callback: 'medium'
  },
  hard: {
    emoji: '🔴',
    name: 'Hard',
    callback: 'hard'
  },
  all: {
    emoji: '📋',
    name: 'All difficulties',
    callback: 'all'
  }
} as const satisfies KeyboardDictionary;

// Функция для получения эмодзи сложности
export const getDifficultyEmoji = (difficulty: string) => hasDictionaryKey(DIFFICULTY_LEVELS, difficulty)
  ? DIFFICULTY_LEVELS[difficulty].emoji
  : '🟢';

// Функция для получения названия сложности
export const getDifficultyName = (difficulty: string) => hasDictionaryKey(DIFFICULTY_LEVELS, difficulty)
  ? DIFFICULTY_LEVELS[difficulty].name
  : 'Easy';

// Константы для сторон
export const SIDE_TYPES = {
  t: {
    emoji: '🔴',
    name: 'T',
    callback: 't'
  },
  ct: {
    emoji: '🔵',
    name: 'CT',
    callback: 'ct'
  },
  all: {
    emoji: '🔴🔵',
    name: 'Both',
    callback: 'all'
  }
} as const satisfies KeyboardDictionary;

export const getSideEmoji = (side: string) => hasDictionaryKey(SIDE_TYPES, side) ? SIDE_TYPES[side].emoji : undefined;
export const getSideName = (side: string) => hasDictionaryKey(SIDE_TYPES, side) ? SIDE_TYPES[side].name : undefined;


// Константы для линий
export const LINE_TYPES = {
  plant_a: {
    emoji: '🅰️',
    name: 'Plant A',
    callback: 'plant_a'
  },
  plant_b: {
    emoji: '🅱️',
    name: 'Plant B',
    callback: 'plant_b'
  },
  mid: {
    emoji: '🎯',
    name: 'Mid',
    callback: 'mid'
  },
  all: {
    emoji: '📋',
    name: 'All lines',
    callback: 'all'
  }
} as const satisfies KeyboardDictionary;
export const getLineEmoji = (line: string) => hasDictionaryKey(LINE_TYPES, line) ? LINE_TYPES[line].emoji : undefined;
export const getLineName = (line: string) => hasDictionaryKey(LINE_TYPES, line) ? LINE_TYPES[line].name : undefined;

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

export type MapKey = keyof typeof MAP_TYPES;
export type GrenadeTypeKey = keyof typeof GRENADE_TYPES;
export type DifficultyKey = keyof typeof DIFFICULTY_LEVELS;
export type SideKey = keyof typeof SIDE_TYPES;
export type LineKey = keyof typeof LINE_TYPES;
export type AdminActionKey = keyof typeof ADMIN_ACTIONS;