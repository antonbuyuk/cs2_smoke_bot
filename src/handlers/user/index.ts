import type { TelegramBot, BotMessage, BotCallbackQuery } from '../../utils/bot';
import type {
  FilterState,
  SuggestState,
  SuggestedMediaFile,
  SmokeWithMap,
  SuggestedSmokeInput,
} from '../../utils/types';

import type {
  MapKey,
  GrenadeTypeKey,
  DifficultyKey,
  SideKey,
  LineKey,
} from '../../config/constants';

import {
  getSmokesByMap,
  getSmokeMedia,
  getSmokeById,
  getAllSmokes,
  addSuggestedSmoke,
  saveSuggestedSmokeImage
} from '../../database/database';

import {
  getGrenadeTypeEmoji,
  getGrenadeTypeName,
  createKeyboard,
  getDifficultyEmoji,
  getDifficultyName,
  getSideEmoji,
  getLineEmoji,
  getSideName,
  getLineName,
  getMapName,
  getMapEmoji,
  escapeMarkdown,
  MAP_TYPES,
  SIDE_TYPES,
  GRENADE_TYPES,
  LINE_TYPES,
  DIFFICULTY_LEVELS
} from '../../config/constants';

const hasDictionaryKey = <T extends Record<PropertyKey, unknown>>(dictionary: T, key: PropertyKey): key is keyof T =>
  Object.prototype.hasOwnProperty.call(dictionary, key);

const isMapKey = (value: string): value is MapKey => hasDictionaryKey(MAP_TYPES, value);
const isGrenadeTypeKey = (value: string): value is GrenadeTypeKey => hasDictionaryKey(GRENADE_TYPES, value);
const isDifficultyKey = (value: string): value is DifficultyKey => hasDictionaryKey(DIFFICULTY_LEVELS, value);
const isSideKey = (value: string): value is SideKey => hasDictionaryKey(SIDE_TYPES, value);
const isLineKey = (value: string): value is LineKey => hasDictionaryKey(LINE_TYPES, value);

type MessageContext = BotMessage | BotCallbackQuery;

const isCallbackContext = (context: MessageContext): context is BotCallbackQuery =>
  'data' in context;

const resolveChatId = (context: MessageContext): number | undefined => {
  if (isCallbackContext(context)) {
    return context.message?.chat?.id;
  }

  return context.chat?.id;
};

const resolveUserId = (context: MessageContext): number | undefined => context.from?.id;

// Функция для получения списка админов из переменных окружения
export const getAdminIds = () => {
  const adminIdsStr = process.env.ADMIN_IDS;
  if (!adminIdsStr) {
    console.error('ADMIN_IDS not found in environment variables, using default admin ID');
    return [226529821]; // Fallback к дефолтному админу
  }
  return adminIdsStr.split(',').map(id => parseInt(id.trim())).filter(id => !isNaN(id));
};

// Глобальная переменная для бота (будет установлена в index.ts)
let bot!: TelegramBot;

// Функция для установки экземпляра бота
export const setBot = (botInstance: TelegramBot) => {
  bot = botInstance;
};

// Обработчик команды /start
export const handleStart = async (msg: BotMessage) => {
  const chatId = msg.chat.id;

  const message = `
🎮 *CS2 Smoke Bot*

Hello! I'll help you find grenades for CS2.

Choose an action:`;

  const keyboard = {
    inline_keyboard: [
      [{ text: '🗺 Maps', callback_data: 'start_maps' }],
      [{ text: '💡 Suggest Grenade', callback_data: 'start_suggest' }],
      [{ text: '📚 Help', callback_data: 'start_help' }],
    ]
  };


  bot.sendMessage(chatId, message, { parse_mode: 'Markdown', reply_markup: keyboard });
};

// Обработчик команды /help
export const handleHelp = async (context: MessageContext) => {
  const chatId = resolveChatId(context);

  if (chatId === undefined) {
    return;
  }

  try {
    const userId = resolveUserId(context);
    const adminIds = getAdminIds();
    const isCurrentUserAdmin = userId !== undefined && adminIds.includes(userId);

    let helpMessage = `
📚 Command Help

Available maps:
- all - All maps
- dust2 - Dust 2
- mirage - Mirage
- inferno - Inferno
- overpass - Overpass
- nuke - Nuke
- ancient - Ancient
- vertigo - Vertigo

Smoke difficulty:
🟢 Easy - easy
🟡 Medium - medium
🔴 Hard - hard

Sides:
🔴 T (terrorists)
🔵 CT (counter-terrorists)
🔴🔵 Both (both sides)

Lines:
🅰️ Plant A
🅱️ Plant B
🎯 Mid`;

    // Добавляем админские команды только для админов
    if (isCurrentUserAdmin) {
      helpMessage += `

Admin commands:

/addsmoke - add new smoke
/deletesmoke - delete smoke
/viewsuggestions - view and approve suggested grenades`;
    }

    bot.sendMessage(chatId, helpMessage, { parse_mode: 'Markdown' });
  } catch (error) {
    console.error('handleHelp error:', error);
  }
};

// Состояния для гранат
export const filterStates = new Map<number, FilterState>();

// Состояния для предложения гранат
export const suggestStates = new Map<number, SuggestState>();

// Обработчик команды /maps
export const handleMaps = async (context: MessageContext) => {
  const chatId = resolveChatId(context);

  if (chatId === undefined) {
    return;
  }

  try {
    filterStates.set(chatId, {
      chatId,
      smokes: [],
      filterParams: {
        mapName: 'all',
        grenadeType: 'all',
        side: 'all',
        line: 'all',
        difficulty: 'all'
      }
    });

    const message = `🗺 *Available maps:*

*Filters:*
${getMapEmoji('all') || '📋'} Map: ${getMapName('all') || 'All maps'}
${getGrenadeTypeEmoji('all')} Grenade type: ${getGrenadeTypeName('all')}
${getLineEmoji('all')} Line: ${getLineName('all')}
${getDifficultyEmoji('all')} Difficulty: ${getDifficultyName('all')}`;

    const keyboard = createKeyboard('map', MAP_TYPES);
    bot.sendMessage(chatId, message, { parse_mode: 'Markdown', reply_markup: keyboard });
  } catch (error) {
    const fallbackMessage = error instanceof Error ? error.message : 'Unknown error';
    bot.sendMessage(chatId, `❌ Error getting maps: ${fallbackMessage}`);
  }
};

// Обработчик предложения гранаты
export const handleSuggestGrenade = async (callbackQuery: BotCallbackQuery) => {
  const chatId = resolveChatId(callbackQuery);

  if (chatId === undefined) {
    return;
  }

  try {
    const userId = callbackQuery.from.id;
    const username = callbackQuery.from.username || callbackQuery.from.first_name || 'Unknown user';

    suggestStates.set(chatId, {
      chatId,
      userId,
      username,
      step: 'select_map',
      filterParams: {
        mapName: 'all',
        grenadeType: 'all',
        side: 'all',
        line: 'all',
        difficulty: 'all'
      }
    });

    const message = `💡 *Suggest a Grenade*

Choose a map for your grenade:`;

    const keyboard = createKeyboard(
      'suggest_map',
      Object.fromEntries(Object.entries(MAP_TYPES).filter(([key]) => key !== 'all'))
    );

    bot.sendMessage(chatId, message, { parse_mode: 'Markdown', reply_markup: keyboard });
  } catch (error) {
    const fallbackMessage = error instanceof Error ? error.message : 'Unknown error';
    bot.sendMessage(chatId, `❌ Error starting suggestion process: ${fallbackMessage}`);
  }
};

// Обработчик выбора карты для предложения
export const handleSuggestMapCallback = async (callbackQuery: BotCallbackQuery, mapName: string) => {
  const chatId = resolveChatId(callbackQuery);

  if (chatId === undefined) {
    return;
  }

  try {
    const state = suggestStates.get(chatId);

    if (!state) {
      bot.sendMessage(chatId, '❌ Suggestion state not found', { parse_mode: 'Markdown' });
      return;
    }

    if (!isMapKey(mapName) || mapName === 'all') {
      bot.sendMessage(chatId, '❌ Invalid map selection', { parse_mode: 'Markdown' });
      return;
    }

    state.filterParams.mapName = mapName;
    state.step = 'select_side';

    const message = `🔴🔵 Choose side for your grenade:

${getMapEmoji(mapName)} Map: ${getMapName(mapName)}`;

    const keyboard = createKeyboard('suggest_side', SIDE_TYPES);
    bot.sendMessage(chatId, message, { parse_mode: 'Markdown', reply_markup: keyboard });
  } catch (error) {
    const fallbackMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('handleSuggestMapCallback error:', error);
    bot.sendMessage(chatId, `❌ Error selecting map: ${fallbackMessage}`);
  }
};

// Обработчик выбора стороны для предложения
export const handleSuggestSideCallback = async (callbackQuery: BotCallbackQuery, side: string) => {
  const chatId = resolveChatId(callbackQuery);

  if (chatId === undefined) {
    return;
  }

  try {
    const state = suggestStates.get(chatId);

    if (!state) {
      bot.sendMessage(chatId, '❌ Suggestion state not found', { parse_mode: 'Markdown' });
      return;
    }

    if (!isSideKey(side) || side === 'all') {
      bot.sendMessage(chatId, '❌ Invalid side selection', { parse_mode: 'Markdown' });
      return;
    }

    state.filterParams.side = side;
    state.step = 'select_line';

    const message = `📍 Choose line for your grenade:

${getMapEmoji(state.filterParams.mapName)} Map: ${getMapName(state.filterParams.mapName)}
${getSideEmoji(side)} Side: ${getSideName(side)}`;

    const keyboard = createKeyboard('suggest_line', LINE_TYPES);
    bot.sendMessage(chatId, message, { parse_mode: 'Markdown', reply_markup: keyboard });
  } catch (error) {
    const fallbackMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('handleSuggestSideCallback error:', error);
    bot.sendMessage(chatId, `❌ Error selecting side: ${fallbackMessage}`);
  }
};

// Обработчик выбора линии для предложения
export const handleSuggestLineCallback = async (callbackQuery: BotCallbackQuery, line: string) => {
  const chatId = resolveChatId(callbackQuery);

  if (chatId === undefined) {
    return;
  }

  try {
    const state = suggestStates.get(chatId);

    if (!state) {
      bot.sendMessage(chatId, '❌ Suggestion state not found', { parse_mode: 'Markdown' });
      return;
    }

    if (!isLineKey(line) || line === 'all') {
      bot.sendMessage(chatId, '❌ Invalid line selection', { parse_mode: 'Markdown' });
      return;
    }

    state.filterParams.line = line;
    state.step = 'select_grenade_type';

    const message = `💨 Choose grenade type:

${getMapEmoji(state.filterParams.mapName)} Map: ${getMapName(state.filterParams.mapName)}
${getSideEmoji(state.filterParams.side)} Side: ${getSideName(state.filterParams.side)}
${getLineEmoji(line)} Line: ${getLineName(line)}`;

    const keyboard = createKeyboard('suggest_grenade', GRENADE_TYPES);
    bot.sendMessage(chatId, message, { parse_mode: 'Markdown', reply_markup: keyboard });
  } catch (error) {
    const fallbackMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('handleSuggestLineCallback error:', error);
    bot.sendMessage(chatId, `❌ Error selecting line: ${fallbackMessage}`);
  }
};

// Обработчик выбора типа гранаты для предложения
export const handleSuggestGrenadeTypeCallback = async (callbackQuery: BotCallbackQuery, grenadeType: string) => {
  const chatId = resolveChatId(callbackQuery);

  if (chatId === undefined) {
    return;
  }

  try {
    const state = suggestStates.get(chatId);

    if (!state) {
      bot.sendMessage(chatId, '❌ Suggestion state not found', { parse_mode: 'Markdown' });
      return;
    }

    if (!isGrenadeTypeKey(grenadeType) || grenadeType === 'all') {
      bot.sendMessage(chatId, '❌ Invalid grenade type selection', { parse_mode: 'Markdown' });
      return;
    }

    state.filterParams.grenadeType = grenadeType;
    state.step = 'select_difficulty';

    const message = `🎯 Choose difficulty:

${getMapEmoji(state.filterParams.mapName)} Map: ${getMapName(state.filterParams.mapName)}
${getSideEmoji(state.filterParams.side)} Side: ${getSideName(state.filterParams.side)}
${getLineEmoji(state.filterParams.line)} Line: ${getLineName(state.filterParams.line)}
${getGrenadeTypeEmoji(grenadeType)} Grenade type: ${getGrenadeTypeName(grenadeType)}`;

    const keyboard = createKeyboard('suggest_difficulty', DIFFICULTY_LEVELS);
    bot.sendMessage(chatId, message, { parse_mode: 'Markdown', reply_markup: keyboard });
  } catch (error) {
    const fallbackMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('handleSuggestGrenadeTypeCallback error:', error);
    bot.sendMessage(chatId, `❌ Error selecting grenade type: ${fallbackMessage}`);
  }
};

// Обработчик выбора сложности для предложения
export const handleSuggestDifficultyCallback = async (callbackQuery: BotCallbackQuery, difficulty: string) => {
  const chatId = resolveChatId(callbackQuery);

  if (chatId === undefined) {
    return;
  }

  try {
    const state = suggestStates.get(chatId);

    if (!state) {
      bot.sendMessage(chatId, '❌ Suggestion state not found', { parse_mode: 'Markdown' });
      return;
    }

    if (!isDifficultyKey(difficulty) || difficulty === 'all') {
      bot.sendMessage(chatId, '❌ Invalid difficulty selection', { parse_mode: 'Markdown' });
      return;
    }

    state.filterParams.difficulty = difficulty;
    state.step = 'enter_name';

    const message = `📝 *Grenade Details*

${getMapEmoji(state.filterParams.mapName)} Map: ${getMapName(state.filterParams.mapName)}
${getSideEmoji(state.filterParams.side)} Side: ${getSideName(state.filterParams.side)}
${getLineEmoji(state.filterParams.line)} Line: ${getLineName(state.filterParams.line)}
${getGrenadeTypeEmoji(state.filterParams.grenadeType)} Grenade type: ${getGrenadeTypeName(state.filterParams.grenadeType)}
${getDifficultyEmoji(difficulty)} Difficulty: ${getDifficultyName(difficulty)}

Enter the name of your grenade:`;

    bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
  } catch (error) {
    const fallbackMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('handleSuggestDifficultyCallback error:', error);
    bot.sendMessage(chatId, `❌ Error selecting difficulty: ${fallbackMessage}`);
  }
};

// Обработчик выбора карты
export const handleMapCallback = async (callbackQuery: BotCallbackQuery, mapName: string) => {
  const chatId = resolveChatId(callbackQuery);

  if (chatId === undefined) {
    return;
  }

  try {
    const state = filterStates.get(chatId);

    if (!state) {
      bot.sendMessage(chatId, '❌ Smoke selection state not found', { parse_mode: 'Markdown' });
      return;
    }

    if (!isMapKey(mapName)) {
      const errorMessage = `
        ❌ *Invalid map name:* ${getMapName(mapName) ?? mapName}

        *Available maps:*
        - all - All maps
        - dust2 - Dust 2
        - mirage - Mirage
        - inferno - Inferno
        - overpass - Overpass
        - nuke - Nuke
        - ancient - Ancient
        - vertigo - Vertigo

        *Usage:* /smokes dust2 `;
      bot.sendMessage(chatId, errorMessage, { parse_mode: 'Markdown' });
      return;
    }

    const list = mapName === 'all'
      ? await getAllSmokes()
      : await getSmokesByMap(mapName);

    if (list.length === 0) {
      const noSmokesMessage = `❌ *No grenades found for:* ${getMapName(mapName)}
      *Try another map*`;
      bot.sendMessage(chatId, noSmokesMessage, { parse_mode: 'Markdown' });
      return;
    }

    state.filterParams.mapName = mapName;

    const message = `🔴🔵 Choose side:

*Filters:*
${getMapEmoji(mapName)} Map: ${getMapName(mapName)}
${getSideEmoji('all')} Side: ${getSideName('all')}
${getGrenadeTypeEmoji('all')} Grenade type: ${getGrenadeTypeName('all')}
${getLineEmoji('all')} Line: ${getLineName('all')}
${getDifficultyEmoji('all')} Difficulty: ${getDifficultyName('all')}`;

    const keyboard = createKeyboard('side', SIDE_TYPES);
    bot.sendMessage(chatId, message, { parse_mode: 'Markdown', reply_markup: keyboard });
  } catch (error) {
    console.error('handleMapCallback error:', error);
    bot.sendMessage(chatId, '❌ Error getting maps');
  }
};

// Обработчик выбора стороны
export const handleSideCallback = async (callbackQuery: BotCallbackQuery, side: string) => {
  const chatId = resolveChatId(callbackQuery);

  if (chatId === undefined) {
    return;
  }

  try {
    const state = filterStates.get(chatId);

    if (!state) {
      bot.sendMessage(chatId, '❌ Side selection state not found', { parse_mode: 'Markdown' });
      return;
    }

    const resolvedSide = side === 'both' ? 'all' : side;

    if (!isSideKey(resolvedSide)) {
      bot.sendMessage(chatId, '❌ Invalid side', { parse_mode: 'Markdown' });
      return;
    }

    state.filterParams.side = resolvedSide;

    const message = `🗺 *Choose a grenade type:*

${getMapEmoji(state.filterParams.mapName)} Map: ${getMapName(state.filterParams.mapName)}
${getSideEmoji(state.filterParams.side)} Side: ${getSideName(state.filterParams.side)}
${getGrenadeTypeEmoji(state.filterParams.grenadeType)} Grenade type: ${getGrenadeTypeName(state.filterParams.grenadeType)}
${getLineEmoji(state.filterParams.line)} Line: ${getLineName(state.filterParams.line)}
${getDifficultyEmoji(state.filterParams.difficulty)} Difficulty: ${getDifficultyName(state.filterParams.difficulty)}`;

    const keyboard = createKeyboard('line', LINE_TYPES);
    bot.sendMessage(chatId, message, { parse_mode: 'Markdown', reply_markup: keyboard });
  } catch (error) {
    console.error('handleSideCallback error:', error);
    bot.sendMessage(chatId, '❌ Error getting sides');
  }
};

// Обработчик выбора типа гранаты
export const handleGrenadeTypeCallback = async (callbackQuery: BotCallbackQuery, grenadeType: string) => {
  const chatId = resolveChatId(callbackQuery);

  if (chatId === undefined) {
    return;
  }

  try {
    const state = filterStates.get(chatId);

    if (!state) {
      bot.sendMessage(chatId, '❌ Smoke selection state not found', { parse_mode: 'Markdown' });
      return;
    }

    if (!isGrenadeTypeKey(grenadeType)) {
      bot.sendMessage(chatId, '❌ Invalid grenade type', { parse_mode: 'Markdown' });
      return;
    }

    state.filterParams.grenadeType = grenadeType;

    const message = `📍 *Choose a line for:*

  ${getMapEmoji(state.filterParams.mapName)} Map: ${getMapName(state.filterParams.mapName)}
  ${getSideEmoji(state.filterParams.side)} Side: ${getSideName(state.filterParams.side)}
  ${getGrenadeTypeEmoji(state.filterParams.grenadeType)} Grenade type: ${getGrenadeTypeName(state.filterParams.grenadeType)}
  ${getLineEmoji(state.filterParams.line)} Line: ${getLineName(state.filterParams.line)}
  ${getDifficultyEmoji(state.filterParams.difficulty)} Difficulty: ${getDifficultyName(state.filterParams.difficulty)}`;

    const keyboard = createKeyboard('difficulty', DIFFICULTY_LEVELS);
    bot.sendMessage(chatId, message, { parse_mode: 'Markdown', reply_markup: keyboard });
  } catch (error) {
    console.error('handleGrenadeTypeCallback error:', error);
    bot.sendMessage(chatId, '❌ Error selecting grenade type');
  }
};

// Обработчик выбора линии
export const handleLineCallback = async (callbackQuery: BotCallbackQuery, line: string) => {
  const chatId = resolveChatId(callbackQuery);

  if (chatId === undefined) {
    return;
  }

  try {
    const state = filterStates.get(chatId);

    if (!state) {
      bot.sendMessage(chatId, '❌ Filter state not found', { parse_mode: 'Markdown' });
      return;
    }

    if (!isLineKey(line)) {
      bot.sendMessage(chatId, '❌ Invalid line', { parse_mode: 'Markdown' });
      return;
    }
    state.filterParams.line = line;

    const message = `🎯 Choose difficulty for:

*Filters:*
${getMapEmoji(state.filterParams.mapName)} Map: ${getMapName(state.filterParams.mapName)}
${getSideEmoji(state.filterParams.side)} Side: ${getSideName(state.filterParams.side)}
${getGrenadeTypeEmoji(state.filterParams.grenadeType)} Grenade type: ${getGrenadeTypeName(state.filterParams.grenadeType)}
${getLineEmoji(state.filterParams.line)} Line: ${getLineName(state.filterParams.line)}
${getDifficultyEmoji(state.filterParams.difficulty)} Difficulty: ${getDifficultyName(state.filterParams.difficulty)}`;

    const keyboard = createKeyboard('grenade', GRENADE_TYPES);
    bot.sendMessage(chatId, message, { parse_mode: 'Markdown', reply_markup: keyboard });
  } catch (error) {
    console.error('Error in handleLineCallback:', error);
  }
};

// Обработчик выбора сложности
export const handleDifficultyCallback = async (callbackQuery: BotCallbackQuery, difficulty: string) => {
  const chatId = resolveChatId(callbackQuery);

  if (chatId === undefined) {
    return;
  }

  const state = filterStates.get(chatId);

  if (!state) {
    bot.sendMessage(chatId, '❌ Filter state not found', { parse_mode: 'Markdown' });
    return;
  }

  if (!isDifficultyKey(difficulty)) {
    bot.sendMessage(chatId, '❌ Invalid difficulty', { parse_mode: 'Markdown' });
    return;
  }

  state.filterParams.difficulty = difficulty;
  await showFilteredResults(callbackQuery, state);
};

// Обработчик выбора конкретного смока через callback
export const handleSmokeDetailsCallback = async (callbackQuery: BotCallbackQuery, smokeId: number) => {
  const chatId = callbackQuery.message?.chat?.id;

  if (chatId === undefined) {
    return;
  }

  try {
    const smoke = await getSmokeById(smokeId);

    if (!smoke) {
      bot.sendMessage(chatId, '❌ Smoke not found', { parse_mode: 'Markdown' });
      return;
    }

    const mediaFiles = await getSmokeMedia(smoke.id);

    const mapName = getMapName(smoke.map_name) ?? smoke.map_display_name;
    const mapEmoji = getMapEmoji(smoke.map_name) ?? '🗺';
    const grenadeTypeEmoji = getGrenadeTypeEmoji(smoke.grenade_type);
    const grenadeTypeName = getGrenadeTypeName(smoke.grenade_type);
    const sideName = getSideName(smoke.side) ?? 'Side';
    const sideEmoji = getSideEmoji(smoke.side) ?? '🎯';
    const rawLine = smoke.line ?? 'all';
    const lineEmoji = getLineEmoji(rawLine) ?? '📍';
    const lineName = getLineName(rawLine) ?? 'Line';
    const difficultyEmoji = getDifficultyEmoji(smoke.difficulty);
    const difficultyName = getDifficultyName(smoke.difficulty);

    const message = `[${smoke.name} (ID: ${smoke.id})]

${mapEmoji} ${mapName} - ${grenadeTypeEmoji} ${grenadeTypeName} - ${sideEmoji} ${sideName} - ${lineEmoji} ${lineName} - ${difficultyEmoji} ${difficultyName}:

*Instructions:*
${smoke.lineup_instructions}

*Media:*
${mediaFiles.length > 0 ? `📸 ${mediaFiles.length} media files` : 'No media files'}`;

    if (mediaFiles.length > 0) {
      const mediaGroup = mediaFiles.map((media, index): TelegramBot.InputMedia => ({
        type: media.media_type,
        media: media.file_id,
        ...(index === 0 ? { caption: message, parse_mode: 'Markdown' as const } : {})
      }));

      bot.sendMediaGroup(chatId, mediaGroup);
    } else {
      bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
    }
  } catch (error) {
    console.error('Error handling smoke details:', error);
    bot.sendMessage(chatId, '❌ Error occurred', { parse_mode: 'Markdown' });
  }
};

// Функция показа отфильтрованных результатов
export const showFilteredResults = async (callbackQuery: BotCallbackQuery, state: FilterState) => {
  const chatId = callbackQuery.message?.chat?.id;

  if (chatId === undefined) {
    return;
  }

  const allSmokes = state.filterParams.mapName === 'all'
    ? await getAllSmokes()
    : await getSmokesByMap(state.filterParams.mapName);

  const filteredList = allSmokes.filter((item) => {
    const { filterParams } = state;

    return (
      [item.line, 'all'].includes(filterParams.line) &&
      [item.grenade_type, 'all'].includes(filterParams.grenadeType) &&
      [item.difficulty, 'all'].includes(filterParams.difficulty) &&
      [item.side, 'all'].includes(filterParams.side) &&
      [item.map_name, 'all'].includes(filterParams.mapName)
    );
  });

  if (filteredList.length === 0) {
    bot.sendMessage(chatId, '❌ No results found. Please try again.', { parse_mode: 'Markdown' });
    return;
  }

  state.smokes = filteredList;

  const message = `*Results:*

*Filters:*
${getMapEmoji(state.filterParams.mapName)} Map: ${getMapName(state.filterParams.mapName)}
${getSideEmoji(state.filterParams.side)} Side: ${getSideName(state.filterParams.side)}
${getGrenadeTypeEmoji(state.filterParams.grenadeType)} Grenade type: ${getGrenadeTypeName(state.filterParams.grenadeType)}
${getLineEmoji(state.filterParams.line)} Line: ${getLineName(state.filterParams.line)}
${getDifficultyEmoji(state.filterParams.difficulty)} Difficulty: ${getDifficultyName(state.filterParams.difficulty)}`;

  const keyboard = {
    inline_keyboard: filteredList.map((item, index) => [{
      text: `${index + 1}. ${item.name} (ID: ${item.id})`,
      callback_data: `smoke_details_${item.id}`
    }])
  };

  bot.sendMessage(chatId, message, { reply_markup: keyboard, parse_mode: 'Markdown' });
};

// Обработчик выбора конкретного смока (для обратной совместимости с текстовым интерфейсом)
export const handleSmokeSelection = async (msg: BotMessage) => {
  const chatId = msg.chat.id;
  const text = msg.text ?? '';

  const state = filterStates.get(chatId);

  if (!state) {
    console.error(`[DEBUG] No state found for user ${chatId}`);
    return;
  }

  const smokeIndex = Number.parseInt(text, 10) - 1;

  if (Number.isNaN(smokeIndex) || smokeIndex < 0 || smokeIndex >= state.smokes.length) {
    bot.sendMessage(chatId, '❌ Invalid smoke number. Try again.');
    return;
  }

  const smoke = state.smokes[smokeIndex] as SmokeWithMap;

  try {
    const mediaFiles = await getSmokeMedia(smoke.id);
    const side = getSideEmoji(smoke.side) ?? '';
    const lineEmoji = getLineEmoji(smoke.line ?? 'all') ?? '';

    const difficultyIcon = getDifficultyEmoji(smoke.difficulty);
    let smokeText = `[${difficultyIcon} ${escapeMarkdown(smoke.name)}]\n\n`;

    const sideName = escapeMarkdown(getSideName(smoke.side) ?? '');
    const lineName = escapeMarkdown(getLineName(smoke.line ?? 'all') ?? '');

    smokeText += `💨 ${getMapName(smoke.map_name)} - ${side}${sideName} - ${lineEmoji}${lineName}:\n\n`;
    smokeText += `*Instructions:*\n${escapeMarkdown(smoke.lineup_instructions ?? '')}`;

    if (mediaFiles.length > 0) {
      const mediaGroup = mediaFiles.map((media, index): TelegramBot.InputMedia => ({
        type: media.media_type,
        media: media.file_id,
        ...(index === 0 ? { caption: smokeText, parse_mode: 'Markdown' as const } : {})
      }));

      await bot.sendMediaGroup(chatId, mediaGroup);
    } else {
      bot.sendMessage(chatId, smokeText, { parse_mode: 'Markdown' });
    }

    filterStates.delete(chatId);
  } catch (error) {
    console.error(`Error sending smoke ${smoke.name}:`, error);

    const fallbackLineEmoji = getLineEmoji(smoke.line ?? 'all') ?? '';
    const fallbackLineName = getLineName(smoke.line ?? 'all') ?? '';

    const fallbackText = [
      `[${getGrenadeTypeEmoji(smoke.grenade_type)} ${getDifficultyEmoji(smoke.difficulty)} ${smoke.name}]`,
      `${getGrenadeTypeEmoji(smoke.grenade_type)} ${getDifficultyEmoji(smoke.difficulty)} ${smoke.map_display_name} - ${getSideEmoji(smoke.side)}${getSideName(smoke.side)} - ${fallbackLineEmoji}${fallbackLineName}:`,
      `*Instructions:*\n${escapeMarkdown(smoke.lineup_instructions)}`
    ].join('');

    bot.sendMessage(chatId, fallbackText, { parse_mode: 'Markdown' });
    filterStates.delete(chatId);
  }
};

// Обработчик callback запросов
export const handleCallbackQuery = async (callbackQuery: BotCallbackQuery) => {
  const data = callbackQuery.data ?? '';
  const chatId = resolveChatId(callbackQuery);

  if (chatId === undefined) {
    return;
  }

  try {
    switch (true) {
      case data === 'start_maps':
        await handleMaps(callbackQuery);
        break;
      case data === 'start_help':
        await handleHelp(callbackQuery);
        break;
      case data === 'start_suggest':
        await handleSuggestGrenade(callbackQuery);
        break;
      default: {
        if (data.startsWith('map_')) {
          await handleMapCallback(callbackQuery, data.replace('map_', ''));
        } else if (data.startsWith('side_')) {
          await handleSideCallback(callbackQuery, data.replace('side_', ''));
        } else if (data.startsWith('line_')) {
          await handleLineCallback(callbackQuery, data.replace('line_', ''));
        } else if (data.startsWith('grenade_')) {
          await handleGrenadeTypeCallback(callbackQuery, data.replace('grenade_', ''));
        } else if (data.startsWith('difficulty_')) {
          await handleDifficultyCallback(callbackQuery, data.replace('difficulty_', ''));
        } else if (data.startsWith('smoke_details_')) {
          const smokeId = Number.parseInt(data.replace('smoke_details_', ''), 10);
          if (Number.isNaN(smokeId)) {
            bot.sendMessage(chatId, '❌ Invalid smoke identifier', { parse_mode: 'Markdown' });
          } else {
            await handleSmokeDetailsCallback(callbackQuery, smokeId);
          }
        } else if (data.startsWith('suggest_map_')) {
          await handleSuggestMapCallback(callbackQuery, data.replace('suggest_map_', ''));
        } else if (data.startsWith('suggest_side_')) {
          await handleSuggestSideCallback(callbackQuery, data.replace('suggest_side_', ''));
        } else if (data.startsWith('suggest_line_')) {
          await handleSuggestLineCallback(callbackQuery, data.replace('suggest_line_', ''));
        } else if (data.startsWith('suggest_grenade_')) {
          await handleSuggestGrenadeTypeCallback(callbackQuery, data.replace('suggest_grenade_', ''));
        } else if (data.startsWith('suggest_difficulty_')) {
          await handleSuggestDifficultyCallback(callbackQuery, data.replace('suggest_difficulty_', ''));
        } else {
          console.log('Invalid callback data:', data);
          bot.sendMessage(chatId, '❌ Invalid callback data', { parse_mode: 'Markdown' });
        }
      }
        break;
    }
  } catch (error) {
    console.error('handleCallbackQuery error:', error);
    bot.sendMessage(chatId, '❌ Error occurred', { parse_mode: 'Markdown' });
  }
};

// Обработчик текстовых сообщений для предложения гранат
export const handleSuggestMessage = async (msg: BotMessage) => {
  const chatId = msg.chat.id;
  const text = msg.text ?? '';
  const state = suggestStates.get(chatId);

  if (!state) {
    return;
  }

  switch (state.step) {
    case 'enter_name':
      state.name = text;
      state.step = 'enter_instructions';
      bot.sendMessage(chatId, '📝 Enter detailed instructions for your grenade:');
      break;
    case 'enter_instructions': {
      state.lineup_instructions = text;
      state.step = 'upload_media';

      const message = `📸 *Upload Media*

${getMapEmoji(state.filterParams.mapName)} Map: ${getMapName(state.filterParams.mapName)}
${getSideEmoji(state.filterParams.side)} Side: ${getSideName(state.filterParams.side)}
${getLineEmoji(state.filterParams.line)} Line: ${getLineName(state.filterParams.line)}
${getGrenadeTypeEmoji(state.filterParams.grenadeType)} Grenade type: ${getGrenadeTypeName(state.filterParams.grenadeType)}
${getDifficultyEmoji(state.filterParams.difficulty)} Difficulty: ${getDifficultyName(state.filterParams.difficulty)}

*Name:* ${state.name}
*Instructions:* ${state.lineup_instructions}

Send photos/videos for your grenade (optional):
• Format: JPG, PNG, MP4
• Size: up to 10MB
• You can send multiple files at once

Or send "skip" to submit without media.`;

      bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
      break;
    }
    case 'upload_media':
      if (text.toLowerCase() === 'skip') {
        // Пропускаем загрузку медиафайлов
        await saveSuggestedGrenade(state, []);
      }
      break;
    default:
      break;
  }
};

// Функция для сохранения предложенной гранаты
export const saveSuggestedGrenade = async (state: SuggestState, mediaFiles: SuggestedMediaFile[] = []) => {
  const chatId = state.chatId;

  try {
    const smokeData: SuggestedSmokeInput = {
      name: state.name ?? '',
      lineup_instructions: state.lineup_instructions ?? '',
      difficulty: state.filterParams.difficulty as DifficultyKey,
      side: state.filterParams.side as SideKey,
      line: state.filterParams.line as LineKey,
      grenadeType: state.filterParams.grenadeType as GrenadeTypeKey,
      imageUrl: null
    };

    const suggestedSmokeId = await addSuggestedSmoke(state.filterParams.mapName as MapKey, smokeData, state.userId, state.username);

    if (mediaFiles.length > 0) {
      for (const file of mediaFiles) {
        await saveSuggestedSmokeImage(suggestedSmokeId, file.fileId, file.type, file.caption ?? null);
      }
    }

    const successMessage = `✅ *Grenade suggestion submitted successfully!*

*Details:*
${getMapEmoji(state.filterParams.mapName)} Map: ${getMapName(state.filterParams.mapName)}
${getSideEmoji(state.filterParams.side)} Side: ${getSideName(state.filterParams.side)}
${getLineEmoji(state.filterParams.line)} Line: ${getLineName(state.filterParams.line)}
${getGrenadeTypeEmoji(state.filterParams.grenadeType)} Grenade type: ${getGrenadeTypeName(state.filterParams.grenadeType)}
${getDifficultyEmoji(state.filterParams.difficulty)} Difficulty: ${getDifficultyName(state.filterParams.difficulty)}

*Name:* ${state.name}
*Instructions:* ${state.lineup_instructions}
*Media files:* ${mediaFiles.length}

Your suggestion will be reviewed by admins. Thank you!`;

    bot.sendMessage(chatId, successMessage, { parse_mode: 'Markdown' });
    suggestStates.delete(chatId);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error saving suggested grenade:', error);
    bot.sendMessage(chatId, `❌ Error submitting suggestion: ${message}`);
    suggestStates.delete(chatId);
  }
};

// Обработчик фотографий для предложения гранат
export const handleSuggestPhoto = async (msg: BotMessage) => {
  const chatId = msg.chat.id;
  const state = suggestStates.get(chatId);

  if (!state || state.step !== 'upload_media') {
    return; // Игнорируем фото, если не в процессе предложения гранаты
  }

  const photo = msg.photo?.[msg.photo.length - 1]; // Получаем последнюю фотографию
  const fileId = photo?.file_id ?? '';

  // Сохраняем предложенную гранату с фото
  await saveSuggestedGrenade(state, [{
    type: 'photo',
    fileId: fileId
  }]);
};

// Обработчик видео для предложения гранат
export const handleSuggestVideo = async (msg: BotMessage) => {
  const chatId = msg.chat.id;
  const state = suggestStates.get(chatId);

  if (!state || state.step !== 'upload_media') {
    return; // Игнорируем видео, если не в процессе предложения гранаты
  }

  const fileId = msg.video?.file_id ?? '';

  // Сохраняем предложенную гранату с видео
  await saveSuggestedGrenade(state, [{
    type: 'video',
    fileId: fileId ?? ''
  }]);
};

// Обработчик группы медиафайлов для предложения гранат
export const handleSuggestMediaGroup = async (messages: BotMessage[]) => {
  const msg = messages[0];
  const chatId = msg.chat.id;
  const state = suggestStates.get(chatId);

  if (!state || state.step !== 'upload_media') {
    return; // Игнорируем медиагруппу, если не в процессе предложения гранаты
  }

  const mediaFiles: SuggestedMediaFile[] = [];

  for (const message of messages) {
    if (message.photo) {
      const photo = message.photo[message.photo.length - 1];
      mediaFiles.push({
        type: 'photo',
        fileId: photo.file_id
      });
    } else if (message.video) {
      const video = message.video;
      mediaFiles.push({
        type: 'video',
        fileId: video.file_id
      });
    }
  }

  if (mediaFiles.length > 0) {
    await saveSuggestedGrenade(state, mediaFiles);
  }
};