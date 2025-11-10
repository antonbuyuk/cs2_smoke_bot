// Функция для создания клавиатуры
const createKeyboard = (prefix: string, arrayName: any) => {
  return {
    inline_keyboard: Object.entries(arrayName).map(([key, value]: [string, any]) => ([{
      text: `${value.emoji} ${value.name}`,
      callback_data: `${prefix}_${value.callback}`
    }]))
  };
};

// Константы для карт
const MAP_TYPES: { [key: string]: { callback: string; name: string; emoji: string } } = {
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
};

const getMapName = (mapName: string) => MAP_TYPES[mapName]?.name;
const getMapEmoji = (mapName: string) => MAP_TYPES[mapName]?.emoji;


// Константы для типов гранат
const GRENADE_TYPES: { [key: string]: { emoji: string; name: string; callback: string } } = {
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
};

// Функция для получения эмодзи типа гранаты
const getGrenadeTypeEmoji = (grenadeType: string) => GRENADE_TYPES[grenadeType]?.emoji || '💨';

// Функция для получения названия типа гранаты
const getGrenadeTypeName = (grenadeType: string) => GRENADE_TYPES[grenadeType]?.name || 'Smoke';

// Константы для сложности
const DIFFICULTY_LEVELS: { [key: string]: { emoji: string; name: string; callback: string } } = {
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
};

// Функция для получения эмодзи сложности
const getDifficultyEmoji = (difficulty: string) => DIFFICULTY_LEVELS[difficulty]?.emoji || '🟢';

// Функция для получения названия сложности
const getDifficultyName = (difficulty: string) => DIFFICULTY_LEVELS[difficulty]?.name || 'Easy';

// Константы для сторон
const SIDE_TYPES: { [key: string]: { emoji: string; name: string; callback: string } } = {
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
};

const getSideEmoji = (side: string) => SIDE_TYPES[side]?.emoji;
const getSideName = (side: string) => SIDE_TYPES[side]?.name;


// Константы для линий
const LINE_TYPES: { [key: string]: { emoji: string; name: string; callback: string } } = {
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
};
const getLineEmoji = (line: string) => LINE_TYPES[line]?.emoji;
const getLineName = (line: string) => LINE_TYPES[line]?.name;

// Константы для действий админа
const ADMIN_ACTIONS: { [key: string]: { emoji: string; name: string; callback: string } } = {
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
};

// Функция для получения эмодзи действия админа
const getAdminActionEmoji = (action: string) => {
  return ADMIN_ACTIONS[action]?.emoji || '⚙️';
};

// Функция для получения названия действия админа
const getAdminActionName = (action: string) => {
  return ADMIN_ACTIONS[action]?.name || 'Action';
};

// Функция для создания клавиатуры действий админа
const createAdminActionKeyboard = (prefix: string, actions = ['approve', 'reject', 'edit']) => {
  return {
    inline_keyboard: actions.map(action => ([{
      text: `${ADMIN_ACTIONS[action].emoji} ${ADMIN_ACTIONS[action].name}`,
      callback_data: `${prefix}_${action}_`
    }]))
  };
};

// Функция для безопасного экранирования Markdown
const escapeMarkdown = (text: string) => {
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

export default {
  // Константы
  MAP_TYPES,
  GRENADE_TYPES,
  DIFFICULTY_LEVELS,
  SIDE_TYPES,
  LINE_TYPES,
  ADMIN_ACTIONS,

  // Функции для создания клавиатуры
  createKeyboard,

  // Функции для карт
  getMapName,
  getMapEmoji,

  // Функции для типов гранат
  getGrenadeTypeEmoji,
  getGrenadeTypeName,

  // Функции для сложности
  getDifficultyEmoji,
  getDifficultyName,

  // Функции для сторон
  getSideEmoji,
  getSideName,

  // Функции для линий
  getLineEmoji,
  getLineName,

  // Функции для действий админа
  getAdminActionEmoji,
  getAdminActionName,

  // Утилиты
  escapeMarkdown
};