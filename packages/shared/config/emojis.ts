// Маппинг эмодзи для бота (используется только для Telegram клавиатур)
// Основные данные хранятся в БД, эмодзи нужны только для UI бота

export const MAP_EMOJIS: Record<string, string> = {
  ancient: '🏛️',
  dust2: '🏜️',
  mirage: '🏙️',
  inferno: '🔥',
  overpass: '🌉',
  nuke: '☢️',
  vertigo: '🏗️',
  cache: '📦',
  train: '🚂',
  cobblestone: '🪨',
  all: '📋',
};

export const GRENADE_TYPE_EMOJIS: Record<string, string> = {
  smoke: '💨',
  flash: '⚡',
  he: '💥',
  molotov: '🔥',
  decoy: '🎭',
  all: '📋',
};

export const DIFFICULTY_EMOJIS: Record<string, string> = {
  easy: '🟢',
  medium: '🟡',
  hard: '🔴',
  all: '📋',
};

export const SIDE_EMOJIS: Record<string, string> = {
  t: '🔴',
  ct: '🔵',
  both: '🔴🔵',
  all: '🔴🔵',
};

export const LINE_EMOJIS: Record<string, string> = {
  plant_a: '🅰️',
  plant_b: '🅱️',
  mid: '🎯',
  all: '📋',
};

// Функции для получения эмодзи (с fallback)
export const getMapEmoji = (mapName: string): string => MAP_EMOJIS[mapName] ?? '🗺️';
export const getGrenadeTypeEmoji = (grenadeType: string): string => GRENADE_TYPE_EMOJIS[grenadeType] ?? '💨';
export const getDifficultyEmoji = (difficulty: string): string => DIFFICULTY_EMOJIS[difficulty] ?? '🟢';
export const getSideEmoji = (side: string): string => SIDE_EMOJIS[side] ?? '⚪';
export const getLineEmoji = (line: string): string => LINE_EMOJIS[line] ?? '📍';

