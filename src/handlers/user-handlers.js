const { getMaps, getSmokesByMap, getSmokeMedia, getSmokeById, getAllSmokes, addSuggestedSmoke, saveSuggestedSmokeImage } = require('../database');
const {
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
} = require('../config/constants');

// Функция для получения списка админов из переменных окружения
const getAdminIds = () => {
  const adminIdsStr = process.env.ADMIN_IDS;
  if (!adminIdsStr) {
    console.error('ADMIN_IDS not found in environment variables, using default admin ID');
    return [226529821]; // Fallback к дефолтному админу
  }
  return adminIdsStr.split(',').map(id => parseInt(id.trim())).filter(id => !isNaN(id));
};

// Глобальная переменная для бота (будет установлена в index.js)
let bot;

// Функция для установки экземпляра бота
const setBot = (botInstance) => {
  bot = botInstance;
};

// Обработчик команды /start
const handleStart = async (msg) => {
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
const handleHelp = async (msg) => {
  try {
    const chatId = msg.message?.chat?.id || msg.chat?.id;
    const userId = msg.from?.id;
    const adminIds = getAdminIds();
    const isAdmin = adminIds?.includes(userId);

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
    if (isAdmin) {
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
const filterStates = new Map();

// Состояния для предложения гранат
const suggestStates = new Map();

// Обработчик команды /maps
const handleMaps = async (callbackQuery) => {
  try {
    const chatId = callbackQuery?.message?.chat?.id || callbackQuery?.chat?.id;

    filterStates.set(chatId, {
      chatId: chatId,
      list: [],
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
    const chatId = callbackQuery?.message?.chat?.id || callbackQuery?.chat?.id;
    bot.sendMessage(chatId, '❌ Error getting maps');
  }
};

// Обработчик предложения гранаты
const handleSuggestGrenade = async (callbackQuery) => {
  try {
    const chatId = callbackQuery?.message?.chat?.id || callbackQuery?.chat?.id;
    const userId = callbackQuery.from.id;
    const username = callbackQuery.from.username || callbackQuery.from.first_name;

    suggestStates.set(chatId, {
      chatId: chatId,
      userId: userId,
      username: username,
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

    const keyboard = createKeyboard('suggest_map', Object.fromEntries(Object.entries(MAP_TYPES).filter(([key]) => key !== 'all')));
    bot.sendMessage(chatId, message, { parse_mode: 'Markdown', reply_markup: keyboard });
  } catch (error) {
    const chatId = callbackQuery?.message?.chat?.id || callbackQuery?.chat?.id;
    bot.sendMessage(chatId, '❌ Error starting suggestion process');
  }
};

// Обработчик выбора карты для предложения
const handleSuggestMapCallback = async (callbackQuery, mapName) => {
  try {
    const chatId = callbackQuery.message.chat.id;
    const state = suggestStates.get(chatId);

    if (!state) {
      bot.sendMessage(chatId, '❌ Suggestion state not found', { parse_mode: 'Markdown' });
      return;
    }

    state.filterParams.mapName = mapName;
    state.step = 'select_side';

    const message = `🔴🔵 Choose side for your grenade:

${getMapEmoji(mapName)} Map: ${getMapName(mapName)}`;

    const keyboard = createKeyboard('suggest_side', SIDE_TYPES);
    bot.sendMessage(chatId, message, { parse_mode: 'Markdown', reply_markup: keyboard });
  } catch (error) {
    console.error('handleSuggestMapCallback error:', error);
    bot.sendMessage(chatId, '❌ Error selecting map');
  }
};

// Обработчик выбора стороны для предложения
const handleSuggestSideCallback = async (callbackQuery, side) => {
  try {
    const chatId = callbackQuery.message.chat.id;
    const state = suggestStates.get(chatId);

    if (!state) {
      bot.sendMessage(chatId, '❌ Suggestion state not found', { parse_mode: 'Markdown' });
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
    console.error('handleSuggestSideCallback error:', error);
    bot.sendMessage(chatId, '❌ Error selecting side');
  }
};

// Обработчик выбора линии для предложения
const handleSuggestLineCallback = async (callbackQuery, line) => {
  try {
    const chatId = callbackQuery.message.chat.id;
    const state = suggestStates.get(chatId);

    if (!state) {
      bot.sendMessage(chatId, '❌ Suggestion state not found', { parse_mode: 'Markdown' });
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
    console.error('handleSuggestLineCallback error:', error);
    bot.sendMessage(chatId, '❌ Error selecting line');
  }
};

// Обработчик выбора типа гранаты для предложения
const handleSuggestGrenadeTypeCallback = async (callbackQuery, grenadeType) => {
  try {
    const chatId = callbackQuery.message.chat.id;
    const state = suggestStates.get(chatId);

    if (!state) {
      bot.sendMessage(chatId, '❌ Suggestion state not found', { parse_mode: 'Markdown' });
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
    console.error('handleSuggestGrenadeTypeCallback error:', error);
    bot.sendMessage(chatId, '❌ Error selecting grenade type');
  }
};

// Обработчик выбора сложности для предложения
const handleSuggestDifficultyCallback = async (callbackQuery, difficulty) => {
  try {
    const chatId = callbackQuery.message.chat.id;
    const state = suggestStates.get(chatId);

    if (!state) {
      bot.sendMessage(chatId, '❌ Suggestion state not found', { parse_mode: 'Markdown' });
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
    console.error('handleSuggestDifficultyCallback error:', error);
    bot.sendMessage(chatId, '❌ Error selecting difficulty');
  }
};

// Обработчик выбора карты
const handleMapCallback = async (callbackQuery, mapName) => {
  try {
    const chatId = callbackQuery.message.chat.id;
    const state = filterStates.get(chatId);

    if (!state) {
      bot.sendMessage(chatId, '❌ Smoke selection state not found', { parse_mode: 'Markdown' });
      return;
    }

    const validMaps = [
      'dust2', 'mirage', 'inferno', 'overpass',
      'nuke', 'ancient', 'vertigo', 'all'
    ];

    if (!validMaps.includes(mapName)) {
      const errorMessage = `
        ❌ *Invalid map name:* ${getMapName(mapName)}

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
}

// Обработчик выбора стороны
const handleSideCallback = async (callbackQuery, side) => {
  try {
    const chatId = callbackQuery.message.chat.id;
    const state = filterStates.get(chatId);

    if (!state) {
      bot.sendMessage(chatId, '❌ Side selection state not found', { parse_mode: 'Markdown' });
      return;
    }

    const validSides = [
      't', 'ct', 'both', 'all'
    ];

    if (!validSides.includes(side)) {
      bot.sendMessage(chatId, '❌ Invalid side', { parse_mode: 'Markdown' });
      return;
    }

    state.filterParams.side = side;

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
const handleGrenadeTypeCallback = async (callbackQuery, grenadeType) => {
  const chatId = callbackQuery.message.chat.id;
  const state = filterStates.get(chatId);

  if (!state) {
    bot.sendMessage(chatId, '❌ Smoke selection state not found', { parse_mode: 'Markdown' });
    return;
  }

  const validGrenadeTypes = ['smoke', 'flash', 'he', 'molotov', 'incendiary', 'decoy', 'all'];

  if (!validGrenadeTypes.includes(grenadeType)) {
    const noSmokesMessage = `*Invalid grenade type:`;
    bot.sendMessage(chatId, noSmokesMessage, { parse_mode: 'Markdown' });
    return;
  };

  state.filterParams.grenadeType = grenadeType;

  const message = `📍 *Choose a line for:*

${getMapEmoji(state.filterParams.mapName)} Map: ${getMapName(state.filterParams.mapName)}
${getSideEmoji(state.filterParams.side)} Side: ${getSideName(state.filterParams.side)}
${getGrenadeTypeEmoji(state.filterParams.grenadeType)} Grenade type: ${getGrenadeTypeName(state.filterParams.grenadeType)}
${getLineEmoji(state.filterParams.line)} Line: ${getLineName(state.filterParams.line)}
${getDifficultyEmoji(state.filterParams.difficulty)} Difficulty: ${getDifficultyName(state.filterParams.difficulty)}`;

  const keyboard = createKeyboard('difficulty', DIFFICULTY_LEVELS);
  bot.sendMessage(chatId, message, { parse_mode: 'Markdown', reply_markup: keyboard });

};

// Обработчик выбора линии
const handleLineCallback = async (callbackQuery, line) => {
  try {
    const chatId = callbackQuery.message.chat.id;
    const state = filterStates.get(chatId);

    if (!state) {
      bot.sendMessage(chatId, '❌ Filter state not found', { parse_mode: 'Markdown' });
      return;
    }

    const validLines = [
      'plant_a', 'plant_b', 'mid', 'all'
    ];

    if (!validLines.includes(line)) {
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
const handleDifficultyCallback = async (callbackQuery, difficulty) => {
  const chatId = callbackQuery.message.chat.id;
  const state = filterStates.get(chatId);

  if (!state) {
    bot.sendMessage(chatId, '❌ Filter state not found', { parse_mode: 'Markdown' });
    return;
  }

  state.filterParams.difficulty = difficulty;
  await showFilteredResults(callbackQuery, state);
};

// Обработчик выбора конкретного смока через callback
const handleSmokeDetailsCallback = async (callbackQuery, smokeId) => {
  try {
    const chatId = callbackQuery.message.chat.id;
    const item = await getSmokeById(smokeId);

    if (!item) {
      bot.sendMessage(chatId, '❌ Smoke not found', { parse_mode: 'Markdown' });
      return;
    }

    const mediaFiles = await getSmokeMedia(item.id);

    // Получаем названия стороны и линии
    const mapName = getMapName(item.map_name);
    const mapEmoji = getMapEmoji(item.map_name);
    const grenadeTypeEmoji = getGrenadeTypeEmoji(item.grenade_type);
    const grenadeTypeName = getGrenadeTypeName(item.grenade_type);
    const sideName = getSideName(item.side);
    const sideEmoji = getSideEmoji(item.side);
    const lineName = getLineName(item.line);
    const lineEmoji = getLineEmoji(item.line);
    const difficultyEmoji = getDifficultyEmoji(item.difficulty);
    const difficultyName = getDifficultyName(item.difficulty);

    const message = `[${item.name} (ID: ${item.id})]

${mapEmoji} ${mapName} - ${grenadeTypeEmoji} ${grenadeTypeName} - ${sideEmoji} ${sideName} - ${lineEmoji} ${lineName} - ${difficultyEmoji} ${difficultyName}:

*Instructions:*
${item.lineup_instructions}

*Media:*
${mediaFiles.length > 0 ? `📸 ${mediaFiles.length} media files` : 'No media files'}`;

    if (mediaFiles && mediaFiles.length > 0) {
      // Если есть медиафайлы, отправляем их группой с текстом
      const mediaGroup = [];

      for (let i = 0; i < mediaFiles.length; i++) {
        const media = mediaFiles[i];
        const mediaInput = {
          type: media.media_type === 'photo' ? 'photo' : 'video',
          media: media.file_id
        };

        // Добавляем подпись только к первому файлу
        if (i === 0) {
          mediaInput.caption = message;
          mediaInput.parse_mode = 'Markdown';
        }

        mediaGroup.push(mediaInput);
      }

      bot.sendMediaGroup(chatId, mediaGroup, { parse_mode: 'Markdown' });
    } else {
      bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
    }
  } catch (error) {
    console.error(`error:`, error);
    bot.sendMessage(chatId, '❌ Error occurred', { parse_mode: 'Markdown' });
  }
};

// Функция показа отфильтрованных результатов
const showFilteredResults = async (callbackQuery, state) => {
  const chatId = callbackQuery.message.chat.id;
  let list = state.filterParams.mapName === 'all'
    ? await getAllSmokes() || []
    : await getSmokesByMap(state.filterParams.mapName) || [];

  list = list?.filter(item =>
    [item.line, 'all'].includes(state.filterParams.line) &&
    [item.grenade_type, 'all'].includes(state.filterParams.grenadeType) &&
    [item.difficulty, 'all'].includes(state.filterParams.difficulty) &&
    [item.side, 'all'].includes(state.filterParams.side) &&
    [item.map_name, 'all'].includes(state.filterParams.mapName)
  );

  if (list.length === 0) {
    bot.sendMessage(chatId, '❌ No results found. Please try again.', { parse_mode: 'Markdown' });
    return;
  }

  const message = `*Results:*

*Filters:*
${getMapEmoji(state.filterParams.mapName)} Map: ${getMapName(state.filterParams.mapName)}
${getSideEmoji(state.filterParams.side)} Side: ${getSideName(state.filterParams.side)}
${getGrenadeTypeEmoji(state.filterParams.grenadeType)} Grenade type: ${getGrenadeTypeName(state.filterParams.grenadeType)}
${getLineEmoji(state.filterParams.line)} Line: ${getLineName(state.filterParams.line)}
${getDifficultyEmoji(state.filterParams.difficulty)} Difficulty: ${getDifficultyName(state.filterParams.difficulty)}`;

  const keyboard = {
    inline_keyboard: [
      ...list.map((item, index) => [{
        text: `${index + 1}. ${item.name} (ID: ${item.id})`,
        callback_data: `smoke_details_${item.id}`
      }])
    ]
  };

  bot.sendMessage(chatId, message, { reply_markup: keyboard, parse_mode: 'Markdown' });
};

// Обработчик выбора конкретного смока (для обратной совместимости с текстовым интерфейсом)
const handleSmokeSelection = async (msg) => {
  const chatId = msg.chat.id;
  const text = msg.text;

  const state = filterStates.get(chatId);

  if (!state) {
    console.error(`[DEBUG] No state found for user ${chatId}`);
    return;
  }

  const smokeIndex = parseInt(text) - 1;

  if (smokeIndex < 0 || smokeIndex >= state.smokes.length) {
    bot.sendMessage(chatId, '❌ Invalid smoke number. Try again.');
    return;
  }

  const smoke = state.smokes[smokeIndex];

  try {

    const mediaFiles = await getSmokeMedia(smoke.id);
    const difficulty = getDifficultyEmoji(smoke.difficulty);
    const side = getSideEmoji(smoke.side);
    const line = getLineEmoji(smoke.line);

    // Удаляем дублирующую функцию escapeMarkdown, так как теперь используем из constants
    // const escapeMarkdown = (text) => { ... };

    // Формируем текст в нужном формате
    const difficultyIcon = getDifficultyEmoji(smoke.difficulty);
    let smokeText = `[${difficultyIcon} ${escapeMarkdown(smoke.name)}]\n\n`;

    // Получаем названия стороны и линии
    const sideName = getSideName(smoke.side);
    const lineName = getLineName(smoke.line);

    smokeText += `💨 ${getMapName(smoke.map_name)} - ${side}${escapeMarkdown(sideName)} - ${line}${escapeMarkdown(lineName)}:\n\n`;
    smokeText += `*Instructions:*\n${escapeMarkdown(smoke.lineup_instructions)}`;

    if (mediaFiles && mediaFiles.length > 0) {
      // Если есть медиафайлы, отправляем их группой с текстом
      const mediaGroup = [];

      for (let i = 0; i < mediaFiles.length; i++) {
        const media = mediaFiles[i];
        const mediaInput = {
          type: media.media_type === 'photo' ? 'photo' : 'video',
          media: media.file_id
        };

        // Добавляем подпись только к первому файлу
        if (i === 0) {
          mediaInput.caption = smokeText;
          mediaInput.parse_mode = 'Markdown';
        }

        mediaGroup.push(mediaInput);
      }

      await bot.sendMediaGroup(chatId, mediaGroup);
    } else {
      // Если нет медиафайлов, отправляем только текст
      bot.sendMessage(chatId, smokeText, { parse_mode: 'Markdown' });
    }

    // Очищаем состояние
    filterStates.delete(chatId);

  } catch (error) {
    console.error(`Error sending smoke ${smoke.name}:`, error);
    // Отправляем текст без медиафайлов в случае ошибки
    let smokeText = `[${getGrenadeTypeEmoji(smoke.grenade_type)} ${getDifficultyEmoji(smoke.difficulty)} ${smoke.name}]`;

    smokeText += `${getGrenadeTypeEmoji(smoke.grenade_type)} ${getDifficultyEmoji(smoke.difficulty)} ${smoke.map_display_name} - ${getSideEmoji(smoke.side)}${getSideName(smoke.side)} - ${getLineEmoji(smoke.line)}${getLineName(smoke.line)}:`;
    smokeText += `*Instructions:*\n${escapeMarkdown(smoke.lineup_instructions)}`;

    bot.sendMessage(chatId, smokeText, { parse_mode: 'Markdown' });

    // Очищаем состояние только после успешной отправки
    filterStates.delete(chatId);
  }
};

// Обработчик callback запросов
const handleCallbackQuery = async (callbackQuery) => {
  const data = callbackQuery.data;
  const chatId = callbackQuery.message.chat.id;
  const adminIds = getAdminIds();
  const isAdmin = adminIds.includes(chatId);

  try {
    switch (data) {
      case 'start_maps':
        await handleMaps(callbackQuery);
        break;
      case 'start_help':
        await handleHelp(callbackQuery);
        break;
      case 'start_suggest':
        await handleSuggestGrenade(callbackQuery);
        break;
      default: {
        if (data.startsWith('map_')) {
          const mapName = data.replace('map_', '');
          await handleMapCallback(callbackQuery, mapName);
        } else if (data.startsWith('side_')) {
          const side = data.replace('side_', '');
          await handleSideCallback(callbackQuery, side);
        } else if (data.startsWith('line_')) {
          const line = data.replace('line_', '');
          await handleLineCallback(callbackQuery, line);
        } else if (data.startsWith('grenade_')) {
          const grenadeType = data.replace('grenade_', '');
          await handleGrenadeTypeCallback(callbackQuery, grenadeType);
        } else if (data.startsWith('difficulty_')) {
          const difficulty = data.replace('difficulty_', '');
          await handleDifficultyCallback(callbackQuery, difficulty);
        } else if (data.startsWith('smoke_details_')) {
          const smokeId = data.replace('smoke_details_', '');
          await handleSmokeDetailsCallback(callbackQuery, smokeId);
        } else if (data.startsWith('suggest_map_')) {
          const mapName = data.replace('suggest_map_', '');
          await handleSuggestMapCallback(callbackQuery, mapName);
        } else if (data.startsWith('suggest_side_')) {
          const side = data.replace('suggest_side_', '');
          await handleSuggestSideCallback(callbackQuery, side);
        } else if (data.startsWith('suggest_line_')) {
          const line = data.replace('suggest_line_', '');
          await handleSuggestLineCallback(callbackQuery, line);
        } else if (data.startsWith('suggest_grenade_')) {
          const grenadeType = data.replace('suggest_grenade_', '');
          await handleSuggestGrenadeTypeCallback(callbackQuery, grenadeType);
        } else if (data.startsWith('suggest_difficulty_')) {
          const difficulty = data.replace('suggest_difficulty_', '');
          await handleSuggestDifficultyCallback(callbackQuery, difficulty);
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
const handleSuggestMessage = async (msg) => {
  const chatId = msg.chat.id;
  const text = msg.text;
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
    case 'enter_instructions':
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
const saveSuggestedGrenade = async (state, mediaFiles = []) => {
  const chatId = state.chatId;

  try {
    const smokeData = {
      name: state.name,
      lineup_instructions: state.lineup_instructions,
      difficulty: state.filterParams.difficulty,
      side: state.filterParams.side,
      line: state.filterParams.line,
      grenadeType: state.filterParams.grenadeType
    };

    const suggestedSmokeId = await addSuggestedSmoke(state.filterParams.mapName, smokeData, state.userId, state.username);

    if (mediaFiles && mediaFiles.length > 0) {
      for (const file of mediaFiles) {
        await saveSuggestedSmokeImage(suggestedSmokeId, file.fileId, file.type, file.caption);
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
    console.error('Error saving suggested grenade:', error);
    bot.sendMessage(chatId, `❌ Error submitting suggestion: ${error.message}`);
    suggestStates.delete(chatId);
  }
};

// Обработчик фотографий для предложения гранат
const handleSuggestPhoto = async (msg) => {
  const chatId = msg.chat.id;
  const state = suggestStates.get(chatId);

  if (!state || state.step !== 'upload_media') {
    return; // Игнорируем фото, если не в процессе предложения гранаты
  }

  const photo = msg.photo[msg.photo.length - 1]; // Получаем последнюю фотографию
  const fileId = photo.file_id;

  // Сохраняем предложенную гранату с фото
  await saveSuggestedGrenade(state, [{
    type: 'photo',
    fileId: fileId
  }]);
};

// Обработчик видео для предложения гранат
const handleSuggestVideo = async (msg) => {
  const chatId = msg.chat.id;
  const state = suggestStates.get(chatId);

  if (!state || state.step !== 'upload_media') {
    return; // Игнорируем видео, если не в процессе предложения гранаты
  }

  const video = msg.video;
  const fileId = video.file_id;

  // Сохраняем предложенную гранату с видео
  await saveSuggestedGrenade(state, [{
    type: 'video',
    fileId: fileId
  }]);
};

// Обработчик группы медиафайлов для предложения гранат
const handleSuggestMediaGroup = async (messages) => {
  const msg = messages[0];
  const chatId = msg.chat.id;
  const state = suggestStates.get(chatId);

  if (!state || state.step !== 'upload_media') {
    return; // Игнорируем медиагруппу, если не в процессе предложения гранаты
  }

  const mediaFiles = [];

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

// Экспорт для использования в index.js
module.exports = {
  setBot,
  handleStart,
  handleHelp,
  handleMaps,
  handleSmokeSelection,
  handleSmokeDetailsCallback,
  handleLineCallback,
  handleDifficultyCallback,
  handleCallbackQuery,
  handleSuggestMessage,
  saveSuggestedGrenade,
  handleSuggestPhoto,
  handleSuggestVideo,
  handleSuggestMediaGroup,
  getDifficultyEmoji,
  getSideEmoji,
  getLineEmoji,
  getSideName,
  getLineName,
  getGrenadeTypeEmoji,
  getGrenadeTypeName,
  filterStates,
  suggestStates
};