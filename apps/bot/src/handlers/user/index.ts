import type { TelegramBot, BotMessage, BotCallbackQuery } from '@shared/utils/bot';
import type {
  FilterState,
  SmokeWithMap,
} from '@shared/utils/types';


import {
  getSmokesByMap,
  getSmokeMedia,
  getSmokeById,
  getAllSmokes,
  getMaps,
  getSides,
  getLines,
  getDifficulties,
  getGrenadeTypes,
} from '@shared/database';

import {
  getGrenadeTypeEmoji,
  getDifficultyEmoji,
  getSideEmoji,
  getLineEmoji,
  getMapEmoji,
  escapeMarkdown,
  createKeyboardFromDB,
} from '@shared/config/constants';
import {
  MAP_EMOJIS,
  SIDE_EMOJIS,
  LINE_EMOJIS,
  GRENADE_TYPE_EMOJIS,
  DIFFICULTY_EMOJIS,
} from '@shared/config/emojis';

import {
  isMapKey,
  isGrenadeTypeKey,
  isDifficultyKey,
  isSideKey,
  isLineKey,
  resolveChatId,
} from '@shared/utils/guards';

const resolveUserId = (context: BotMessage | BotCallbackQuery): number | undefined => context.from?.id;

interface InputMediaPayload {
  type: 'photo' | 'video';
  media: string;
  caption?: string;
  parse_mode?: 'Markdown';
}

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
      [{ text: '📚 Help', callback_data: 'start_help' }],
    ]
  };


  bot.sendMessage(chatId, message, { parse_mode: 'Markdown', reply_markup: keyboard });
};

// Обработчик команды /help
export const handleHelp = async (context: BotMessage | BotCallbackQuery) => {
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
`;
    }

    bot.sendMessage(chatId, helpMessage, { parse_mode: 'Markdown' });
  } catch (error) {
    console.error('handleHelp error:', error);
  }
};

// Состояния для гранат
export const filterStates = new Map<number, FilterState>();


// Обработчик команды /maps
export const handleMaps = async (context: BotMessage | BotCallbackQuery) => {
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

    const maps = await getMaps();
    const message = `🗺 *Available maps:*

*Filters:*
${getMapEmoji('all') || '📋'} Map: All maps
${getGrenadeTypeEmoji('all')} Grenade type: All types
${getLineEmoji('all')} Line: All lines
${getDifficultyEmoji('all')} Difficulty: All difficulties`;

    const keyboard = createKeyboardFromDB('map', maps, MAP_EMOJIS, true);
    bot.sendMessage(chatId, message, { parse_mode: 'Markdown', reply_markup: keyboard });
  } catch (error) {
    const fallbackMessage = error instanceof Error ? error.message : 'Unknown error';
    bot.sendMessage(chatId, `❌ Error getting maps: ${fallbackMessage}`);
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
      const maps = await getMaps();
      const map = maps.find(m => m.name === mapName);
      const errorMessage = `
        ❌ *Invalid map name:* ${map?.display_name ?? mapName}

        *Available maps:*
        - all - All maps
        ${maps.map(m => `- ${m.name} - ${m.display_name}`).join('\n')}

        *Usage:* /smokes dust2 `;
      bot.sendMessage(chatId, errorMessage, { parse_mode: 'Markdown' });
      return;
    }

    const list = mapName === 'all'
      ? await getAllSmokes()
      : await getSmokesByMap(mapName);

    if (list.length === 0) {
      const maps = await getMaps();
      const map = maps.find(m => m.name === mapName);
      const noSmokesMessage = `❌ *No grenades found for:* ${map?.display_name ?? mapName}
      *Try another map*`;
      bot.sendMessage(chatId, noSmokesMessage, { parse_mode: 'Markdown' });
      return;
    }

    state.filterParams.mapName = mapName;
    const maps = await getMaps();
    const sides = await getSides();
    const map = maps.find(m => m.name === mapName);

    const message = `🔴🔵 Choose side:

*Filters:*
${getMapEmoji(mapName)} Map: ${map?.display_name ?? mapName}
${getSideEmoji('all')} Side: All sides
${getGrenadeTypeEmoji('all')} Grenade type: All types
${getLineEmoji('all')} Line: All lines
${getDifficultyEmoji('all')} Difficulty: All difficulties`;

    const keyboard = createKeyboardFromDB('side', sides, SIDE_EMOJIS, true);
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
    const maps = await getMaps();
    const sidesData = await getSides();
    const lines = await getLines();
    const map = maps.find(m => m.name === state.filterParams.mapName);
    const sideData = sidesData.find(s => s.name === state.filterParams.side);

    const message = `🗺 *Choose a grenade type:*

${getMapEmoji(state.filterParams.mapName)} Map: ${map?.display_name ?? state.filterParams.mapName}
${getSideEmoji(state.filterParams.side)} Side: ${sideData?.display_name ?? state.filterParams.side}
${getGrenadeTypeEmoji(state.filterParams.grenadeType)} Grenade type: All types
${getLineEmoji(state.filterParams.line)} Line: All lines
${getDifficultyEmoji(state.filterParams.difficulty)} Difficulty: All difficulties`;

    const keyboard = createKeyboardFromDB('line', lines, LINE_EMOJIS, true);
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
    const maps = await getMaps();
    const sides = await getSides();
    const grenadeTypes = await getGrenadeTypes();
    const linesData = await getLines();
    const map = maps.find(m => m.name === state.filterParams.mapName);
    const side = sides.find(s => s.name === state.filterParams.side);
    const grenadeTypeObj = grenadeTypes.find(gt => gt.name === state.filterParams.grenadeType);
    const lineData = linesData.find(l => l.name === state.filterParams.line);

    const message = `📍 *Choose a line for:*

  ${getMapEmoji(state.filterParams.mapName)} Map: ${map?.display_name ?? state.filterParams.mapName}
  ${getSideEmoji(state.filterParams.side)} Side: ${side?.display_name ?? state.filterParams.side}
  ${getGrenadeTypeEmoji(state.filterParams.grenadeType)} Grenade type: ${grenadeTypeObj?.display_name ?? state.filterParams.grenadeType}
  ${getLineEmoji(state.filterParams.line)} Line: ${lineData?.display_name ?? state.filterParams.line ?? 'All'}
  ${getDifficultyEmoji(state.filterParams.difficulty)} Difficulty: All difficulties`;

    const keyboard = createKeyboardFromDB('difficulty', await getDifficulties(), DIFFICULTY_EMOJIS, true);
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

    const grenadeTypes = await getGrenadeTypes();
    const maps = await getMaps();
    const sides = await getSides();
    const linesData = await getLines();
    const map = maps.find(m => m.name === state.filterParams.mapName);
    const side = sides.find(s => s.name === state.filterParams.side);
    const lineData = linesData.find(l => l.name === state.filterParams.line);
    const message = `🎯 Choose difficulty for:

*Filters:*
${getMapEmoji(state.filterParams.mapName)} Map: ${map?.display_name ?? state.filterParams.mapName}
${getSideEmoji(state.filterParams.side)} Side: ${side?.display_name ?? state.filterParams.side}
${getGrenadeTypeEmoji(state.filterParams.grenadeType)} Grenade type: All types
${getLineEmoji(state.filterParams.line)} Line: ${lineData?.display_name ?? state.filterParams.line ?? 'All'}
${getDifficultyEmoji(state.filterParams.difficulty)} Difficulty: All difficulties`;

    const keyboard = createKeyboardFromDB('grenade', grenadeTypes, GRENADE_TYPE_EMOJIS, true);
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
    const sides = await getSides();
    const lines = await getLines();
    const grenadeTypes = await getGrenadeTypes();
    const difficulties = await getDifficulties();

    const mapName = smoke.map_display_name;
    const mapEmoji = getMapEmoji(smoke.map_name) ?? '🗺';
    const grenadeTypeEmoji = getGrenadeTypeEmoji(smoke.grenade_type);
    const grenadeTypeName = grenadeTypes.find(gt => gt.name === smoke.grenade_type)?.display_name ?? smoke.grenade_type;
    const sideName = sides.find(s => s.name === smoke.side)?.display_name ?? smoke.side;
    const sideEmoji = getSideEmoji(smoke.side) ?? '🎯';
    const rawLine = smoke.line ?? 'all';
    const lineEmoji = getLineEmoji(rawLine) ?? '📍';
    const lineName = lines.find(l => l.name === rawLine)?.display_name ?? rawLine;
    const difficultyEmoji = getDifficultyEmoji(smoke.difficulty);
    const difficultyName = difficulties.find(d => d.name === smoke.difficulty)?.display_name ?? smoke.difficulty;

    const message = `[${smoke.name} (ID: ${smoke.id})]

${mapEmoji} ${mapName} - ${grenadeTypeEmoji} ${grenadeTypeName} - ${sideEmoji} ${sideName} - ${lineEmoji} ${lineName} - ${difficultyEmoji} ${difficultyName}:

*Instructions:*
${smoke.lineup_instructions}

*Media:*
${mediaFiles.length > 0 ? `📸 ${mediaFiles.length} media files` : 'No media files'}`;

    if (mediaFiles.length > 0) {
      const mediaGroup = mediaFiles.map((media, index): InputMediaPayload => {
        const base: InputMediaPayload =
          media.media_type === 'video'
            ? { type: 'video', media: media.file_id }
            : { type: 'photo', media: media.file_id };

        if (index === 0) {
          base.caption = message;
          base.parse_mode = 'Markdown';
        }

        return base;
      });

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
  const maps = await getMaps();
  const sides = await getSides();
  const lines = await getLines();
  const grenadeTypes = await getGrenadeTypes();
  const difficulties = await getDifficulties();
  const map = maps.find(m => m.name === state.filterParams.mapName);
  const side = sides.find(s => s.name === state.filterParams.side);
  const lineData = lines.find(l => l.name === state.filterParams.line);
  const grenadeType = grenadeTypes.find(gt => gt.name === state.filterParams.grenadeType);
  const difficulty = difficulties.find(d => d.name === state.filterParams.difficulty);

  const message = `*Results:*

*Filters:*
${getMapEmoji(state.filterParams.mapName)} Map: ${map?.display_name ?? state.filterParams.mapName}
${getSideEmoji(state.filterParams.side)} Side: ${side?.display_name ?? state.filterParams.side}
${getGrenadeTypeEmoji(state.filterParams.grenadeType)} Grenade type: ${grenadeType?.display_name ?? state.filterParams.grenadeType}
${getLineEmoji(state.filterParams.line)} Line: ${lineData?.display_name ?? state.filterParams.line ?? 'All'}
${getDifficultyEmoji(state.filterParams.difficulty)} Difficulty: ${difficulty?.display_name ?? state.filterParams.difficulty}`;

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
    const sides = await getSides();
    const lines = await getLines();
    const side = getSideEmoji(smoke.side) ?? '';
    const lineEmoji = getLineEmoji(smoke.line ?? 'all') ?? '';

    const difficultyIcon = getDifficultyEmoji(smoke.difficulty);
    let smokeText = `[${difficultyIcon} ${escapeMarkdown(smoke.name)}]\n\n`;

    const sideName = escapeMarkdown(sides.find(s => s.name === smoke.side)?.display_name ?? smoke.side);
    const lineName = escapeMarkdown(lines.find(l => l.name === (smoke.line ?? 'all'))?.display_name ?? (smoke.line ?? 'all'));

    smokeText += `💨 ${smoke.map_display_name} - ${side}${sideName} - ${lineEmoji}${lineName}:\n\n`;
    smokeText += `*Instructions:*\n${escapeMarkdown(smoke.lineup_instructions ?? '')}`;

    if (mediaFiles.length > 0) {
      const mediaGroup = mediaFiles.map((media, index): InputMediaPayload => {
        const base: InputMediaPayload =
          media.media_type === 'video'
            ? { type: 'video', media: media.file_id }
            : { type: 'photo', media: media.file_id };

        if (index === 0) {
          base.caption = smokeText;
          base.parse_mode = 'Markdown';
        }

        return base;
      });

      await bot.sendMediaGroup(chatId, mediaGroup);
    } else {
      bot.sendMessage(chatId, smokeText, { parse_mode: 'Markdown' });
    }

    filterStates.delete(chatId);
  } catch (error) {
    console.error(`Error sending smoke ${smoke.name}:`, error);

    const sides = await getSides();
    const lines = await getLines();
    const fallbackLineEmoji = getLineEmoji(smoke.line ?? 'all') ?? '';
    const fallbackLineName = lines.find(l => l.name === (smoke.line ?? 'all'))?.display_name ?? (smoke.line ?? 'all');
    const fallbackSideName = sides.find(s => s.name === smoke.side)?.display_name ?? smoke.side;

    const fallbackText = [
      `[${getGrenadeTypeEmoji(smoke.grenade_type)} ${getDifficultyEmoji(smoke.difficulty)} ${smoke.name}]`,
      `${getGrenadeTypeEmoji(smoke.grenade_type)} ${getDifficultyEmoji(smoke.difficulty)} ${smoke.map_display_name} - ${getSideEmoji(smoke.side)}${fallbackSideName} - ${fallbackLineEmoji}${fallbackLineName}:`,
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
