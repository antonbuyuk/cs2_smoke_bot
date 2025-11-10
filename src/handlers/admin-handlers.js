const { debounce } = require('lodash');
const { addSmoke,
  saveSmokeImage,
  getMaps, getSmokesByMap,
  deleteSmoke,
  getSmokeById,
  getAllSmokes,
  getAllSuggestedSmokes,
  getSuggestedSmokeMedia,
  approveSuggestedSmoke,
  rejectSuggestedSmoke,
  getSuggestedSmokeById,
  addSuggestedSmoke,
  saveSuggestedSmokeImage
} = require('../database');
const {
  getGrenadeTypeEmoji,
  getGrenadeTypeName,
  getDifficultyEmoji,
  getSideEmoji,
  getLineEmoji,
  escapeMarkdown,
  createKeyboard,
  MAP_TYPES,
  SIDE_TYPES,
  LINE_TYPES,
  GRENADE_TYPES,
  getMapEmoji,
  getMapName,
  getLineName,
  getDifficultyName,
  getSideName,
  DIFFICULTY_LEVELS
} = require('../config/constants');

// Импортируем suggestStates из user-handlers
const { suggestStates } = require('./user-handlers');

let lastMessageId = [];

// Функция для получения списка админов из переменных окружения
const getAdminIds = () => {
  const adminIdsStr = process.env.ADMIN_IDS;
  if (!adminIdsStr) {
    console.error('ADMIN_IDS not found in environment variables, using default admin ID');
    return [226529821]; // Fallback к дефолтному админу
  }
  return adminIdsStr.split(',').map(id => parseInt(id.trim())).filter(id => !isNaN(id));
};

// Глобальная переменная для бота
let bot;

// Функция для установки экземпляра бота
const setAdminBot = (botInstance) => {
  bot = botInstance;
};

// Состояния пользователей для добавления смоков
const chatStates = new Map();

// Состояния пользователей для удаления смоков
const deleteStates = new Map();

// Хранилище для медиагрупп
const mediaGroupStorage = new Map();

// Обработчик команды /addsmoke
const handleAddSmoke = async (msg) => {
  const chatId = msg.chat.id;
  const adminIds = getAdminIds();

  if (!adminIds.includes(chatId)) {
    const message = `❌ You don't have permission to add grenades`;
    bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
    return;
  }

  chatStates.delete(chatId);
  deleteStates.delete(chatId);

  try {
    const maps = await getMaps();
    const message = `🗺 Choose a map to add smoke:`;
    const keyboard = createKeyboard('addsmoke_map', Object.fromEntries(Object.entries(MAP_TYPES).filter(([key]) => key !== 'all')));
    chatStates.set(chatId, { maps: maps, chatId: chatId });
    bot.sendMessage(chatId, message, { parse_mode: 'Markdown', reply_markup: keyboard });
  } catch (error) {
    console.error('Error in handleAddSmoke:', error);
    bot.sendMessage(chatId, '❌ Error getting maps list. Please try again.');
  }
};

// Обработчик команды /deletesmoke
const handleDeleteSmoke = async (msg) => {
  const chatId = msg.chat.id;
  const adminIds = getAdminIds();

  if (!adminIds.includes(chatId)) {
    const noAccessMessage = `❌ You don't have permission to delete grenades`;
    bot.sendMessage(chatId, noAccessMessage, { parse_mode: 'Markdown' });
    return;
  }

  chatStates.delete(chatId);
  deleteStates.delete(chatId);

  try {
    const maps = await getMaps();
    const keyboard = createKeyboard('deletesmoke_map', MAP_TYPES);
    const mapsMessage = 'Choose a map to delete smoke:';

    deleteStates.set(chatId, {
      step: 'select_map',
      maps: maps,
      chatId: chatId
    });

    bot.sendMessage(chatId, mapsMessage, { parse_mode: 'Markdown', reply_markup: keyboard });
  } catch (error) {
    console.error('Error in handleDeleteSmoke:', error);
    bot.sendMessage(chatId, '❌ Error getting maps list. Please try again.');
  }
};

// Обработчик команды /reset
const handleReset = async (msg) => {
  const chatId = msg.chat.id;
  const adminIds = getAdminIds();

  if (!adminIds.includes(chatId)) {
    bot.sendMessage(chatId, '❌ You don\'t have permission to reset states');
    return;
  }

  // Очищаем все состояния
  chatStates.delete(chatId);
  deleteStates.delete(chatId);

  bot.sendMessage(chatId, '✅ All states have been reset');
};

// Обработчик текстовых сообщений для админ-панели
const handleAdminMessage = async (msg) => {
  const chatId = msg.chat.id;
  const text = msg.text;

  // Игнорируем команды (они обрабатываются отдельно)
  if (text && text.startsWith('/')) {
    return;
  }

  // Проверяем состояние удаления смоков ПЕРВЫМ (приоритет)
  const deleteState = deleteStates.get(chatId);
  if (deleteState) {
    chatStates.delete(chatId);

    switch (deleteState.step) {
      case 'select_map':
        await handleDeleteMapSelection(msg, text);
        break;
      case 'select_smoke':
        await handleDeleteSmokeSelection(msg, text);
        break;
      case 'confirm_delete':
        await handleConfirmDelete(msg, text);
        break;
    }
    return;
  }

  // Проверяем состояние добавления смоков
  const addState = chatStates.get(chatId);
  if (addState) {
    deleteStates.delete(chatId);

    switch (addState.step) {
      case 'name':
        await handleSmokeNameSelection(msg, text);
        break;
      case 'instructions':
        await handleSmokeInstructionsSelection(msg, text);
        break;
    }
    return;
  }
};

// Обработчик названия смока
const handleSmokeNameSelection = async (msg, text) => {
  const chatId = msg.chat.id;
  const state = chatStates.get(chatId);
  state.name = text;
  state.step = 'instructions';
  bot.sendMessage(chatId, 'Enter smoke setup instructions:');
};

// Функция для отправки запроса на изображение/видео
const sendImagePrompt = async (chatId) => {
  const message = `📸 Send smoke image/video:

Recommendations:
• Format: JPG, PNG, MP4
• Size: up to 10MB
• Content: screenshot with instructions
• You can send multiple files at once`;

  bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
};

// Обработчик инструкций смока
const handleSmokeInstructionsSelection = async (msg, text) => {
  const chatId = msg.chat.id;
  const state = chatStates.get(chatId);
  state.lineup_instructions = text;
  state.step = 'image';
  await sendImagePrompt(chatId); // Вызываем новую функцию для отправки запроса
};

// Обработчик фото
const handlePhoto = async (msg) => {
  const chatId = msg.chat.id;
  const mediaGroupId = msg.media_group_id;
  const state = chatStates.get(chatId);

  if (!state || state.step !== 'image') {
    return; // Игнорируем фото, если не в процессе добавления гранаты
  }

  // Инициализируем хранилище для медиагруппы
  if (!mediaGroupStorage.has(mediaGroupId)) {
    mediaGroupStorage.set(mediaGroupId, {
      chatId: chatId,
      files: [],
      expectedCount: 0,
      receivedCount: 0,
      mediaGroupId: mediaGroupId
    });
  }

  mediaGroupStorage.get(mediaGroupId);
  const photo = msg.photo[msg.photo.length - 1]; // Берем самое большое фото
  const fileId = photo.file_id;

  // Проверяем, является ли это частью медиагруппы
  if (msg.media_group_id) {
    await handleMediaGroupFile(chatId, mediaGroupId, { type: 'photo', fileId: fileId });
    await processCompleteMediaGroup(mediaGroupId)
  } else {
    state.step = null;
    await saveSmokeToDatabase(state, [{
      type: 'photo',
      fileId: fileId,
      caption: caption
    }]);
  }
};

// Обработчик видео
const handleVideo = async (msg) => {
  const chatId = msg.chat.id;
  const mediaGroupId = msg.media_group_id;
  const state = chatStates.get(chatId);

  if (!state || state.step !== 'image') {
    return; // Игнорируем видео, если не в процессе добавления гранаты
  }

  const video = msg.video;
  const fileId = video.file_id;

  // Проверяем, является ли это частью медиагруппы
  if (msg.media_group_id) {
    await handleMediaGroupFile(chatId, msg.media_group_id, { type: 'video', fileId: fileId });
    await processCompleteMediaGroup(mediaGroupId)
  } else {
    // Одиночное видео
    state.step = null;
    await saveSmokeToDatabase(state, [{ type: 'video', fileId: fileId }]);
    await processCompleteMediaGroup(mediaGroupId)
  }
};

// Обработчик медиагруппы
const handleMediaGroup = async (messages) => {
  const msg = messages[0];
  const chatId = msg.chat.id;
  const mediaGroupId = msg.media_group_id;
  const state = chatStates.get(chatId);

  if (!state || state.step !== 'image') {
    return; // Игнорируем медиагруппу, если не в процессе добавления гранаты
  }

  // Инициализируем хранилище для медиагруппы
  if (!mediaGroupStorage.has(mediaGroupId)) {
    mediaGroupStorage.set(mediaGroupId, {
      chatId: chatId,
      files: [],
      expectedCount: messages.length,
      receivedCount: 0
    });
  }

  const groupData = mediaGroupStorage.get(mediaGroupId);

  // Отправляем сообщение о начале обработки медиагруппы
  if (groupData.receivedCount === 0) {
    bot.sendMessage(chatId, '📸 Processing media group... Please wait for all files to be received.');
  }
};

// Обработчик файла из медиагруппы
const handleMediaGroupFile = async (chatId, mediaGroupId, fileData) => {
  const groupData = mediaGroupStorage.get(mediaGroupId);

  if (!groupData) {
    console.error('Media group data not found for ID:', mediaGroupId);
    return;
  }

  const message = `⏳ Images loading...`;
  const messageData = await bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
  lastMessageId = [...lastMessageId, messageData.message_id];

  // Добавляем файл в группу
  groupData.files = [...groupData.files, fileData];
  groupData.receivedCount++;
};

// Обработка завершенной медиагруппы
const processCompleteMediaGroup = debounce(async (mediaGroupId) => {
  const groupData = mediaGroupStorage.get(mediaGroupId);

  if (!groupData) { return; }

  const chatId = groupData.chatId;

  if (lastMessageId?.length > 0) {
    lastMessageId?.forEach(messageId => {
      bot.deleteMessage(chatId, messageId);
    });
    lastMessageId = [];
  }

  const state = chatStates.get(chatId);

  if (!state) {
    mediaGroupStorage.delete(groupData.mediaGroupId);
    return;
  }

  try {
    state.step = null;
    await saveSmokeToDatabase(state, groupData.files);
  } catch (error) {
    console.error('Error processing media group:', error);
    bot.sendMessage(chatId, '❌ Error processing media group. Please try again.');
  } finally {
    mediaGroupStorage.delete(groupData.mediaGroupId);
  }
}, 5000);

// Обработчик выбора карты для удаления
const handleDeleteMapSelection = async (msg, text) => {
  const chatId = msg.chat.id;
  const state = deleteStates.get(chatId);

  let selectedMap = null;

  // Проверяем номер карты
  const mapIndex = parseInt(text) - 1;
  if (mapIndex >= 0 && mapIndex < state.maps.length) {
    selectedMap = state.maps[mapIndex];
  } else {
    // Проверяем название карты
    selectedMap = state.maps.find(map => map.name === text);
  }

  if (!selectedMap) {
    bot.sendMessage(chatId, '❌ Invalid map selection. Try again.');
    return;
  }

  state.selectedMap = selectedMap;
  state.step = 'select_smoke';

  try {
    const smokes = mapName === 'all' ? await getAllSmokes() : await getSmokesByMap(selectedMap.name);

    if (smokes.length === 0) {
      bot.sendMessage(chatId, `❌ No smokes found on ${escapeMarkdown(selectedMap.display_name)} for deletion\.`);
      deleteStates.delete(chatId);
      return;
    }

    let smokesMessage = `🗑 *Choose a smoke to delete on ${escapeMarkdown(selectedMap.display_name)}:*`;

    smokes.forEach((smoke, index) => {
      const difficulty = getDifficultyEmoji(smoke.difficulty);
      const side = getSideEmoji(smoke.side);
      const line = getLineEmoji(smoke.line);

      smokesMessage += `${index + 1}. *${escapeMarkdown(smoke.name)}* ${difficulty} ${side} ${line}`;
      smokesMessage += `   📋 ${escapeMarkdown(smoke.lineup_instructions)}`;
    });

    smokesMessage += 'Send a number for smoke deletion or "cancel" to exit:';

    state.smokes = smokes;
    bot.sendMessage(chatId, smokesMessage, { parse_mode: 'Markdown' });

  } catch (error) {
    bot.sendMessage(chatId, '❌ Error getting smokes');
    deleteStates.delete(chatId);
  }
};

// Обработчик выбора смока для удаления
const handleDeleteSmokeSelection = async (msg, text) => {
  const chatId = msg.chat.id;
  const state = deleteStates.get(chatId);

  if (text.toLowerCase() === 'cancel') {
    bot.sendMessage(chatId, '❌ Deletion cancelled.');
    deleteStates.delete(chatId);
    return;
  }

  const smokeIndex = parseInt(text) - 1;
  if (smokeIndex < 0 || smokeIndex >= state.smokes.length) {
    bot.sendMessage(chatId, '❌ Invalid grenade number. Try again.');
    return;
  }

  const selectedSmoke = state.smokes[smokeIndex];
  state.selectedSmoke = selectedSmoke;
  state.step = 'confirm_delete';

  const confirmMessage = `
⚠️ *Confirm deletion*

*Grenade:* ${selectedSmoke.name}
*Map:* ${state.selectedMap.display_name}
*Difficulty:* ${getDifficultyEmoji(selectedSmoke.difficulty)} ${selectedSmoke.difficulty}
*Side:* ${getSideEmoji(selectedSmoke.side)} ${selectedSmoke.side}
*Line:* ${selectedSmoke.line ? getLineEmoji(selectedSmoke.line) : 'Not specified'}

*Instructions:* ${escapeMarkdown(selectedSmoke.lineup_instructions)}

⚠️ *This action cannot be undone\!*

Send "YES" to confirm deletion or "NO" to cancel:
  `;

  bot.sendMessage(chatId, confirmMessage, { parse_mode: 'Markdown' });
};

// Обработчик подтверждения удаления
const handleConfirmDelete = async (msg, text) => {
  const chatId = msg.chat.id;
  const state = deleteStates.get(chatId);

  if (text.toLowerCase() === 'yes' || text.toLowerCase() === 'yes') {
    try {
      const deletedCount = await deleteSmoke(state.selectedSmoke.id);

      if (deletedCount > 0) {
        const successMessage = `
✅ Grenade successfully deleted!

*Deleted grenade:* ${escapeMarkdown(state.selectedSmoke.name)}
*Map:* ${escapeMarkdown(state.selectedMap.display_name)}

Use /deletesmoke to delete other grenades.        `;
        bot.sendMessage(chatId, successMessage, { parse_mode: 'Markdown' });
      } else {
        bot.sendMessage(chatId, '❌ Error deleting grenade.');
      }
    } catch (error) {
      bot.sendMessage(chatId, `❌ Error deleting grenade: ${error.message}`);
    }
  } else {
    bot.sendMessage(chatId, '❌ Deletion cancelled.');
  }

  // Очищаем состояние
  deleteStates.delete(chatId);
};

// Сохранение смока в базу данных
const saveSmokeToDatabase = async (state, mediaFiles) => {
  const chatId = state.chatId;
  try {
    const smokeId = await addSmoke(state.selectedMap.name, state);

    if (mediaFiles && mediaFiles.length > 0) {
      for (const file of mediaFiles) {
        await saveSmokeImage(smokeId, file.fileId, file.type, file.caption);
      }
    }
    const successMessage = `Grenade successfully added!

Name: ${state.name}
Instructions: ${state.lineup_instructions}

====================================

${getMapEmoji(state.selectedMap.name)} Map: ${state.selectedMap.display_name}
${getSideEmoji(state.side)} Side: ${getSideName(state.side)}
${getLineEmoji(state.line)} Line: ${getLineName(state.line)}
${getGrenadeTypeEmoji(state.grenadeType)} Grenade type: ${getGrenadeTypeName(state.grenadeType)}
${getDifficultyEmoji(state.difficulty)} Difficulty: ${getDifficultyName(state.difficulty)}`;

    bot.sendMessage(chatId, successMessage, { parse_mode: 'Markdown' });
    chatStates.delete(chatId);
  } catch (error) {
    bot.sendMessage(chatId, `Error saving grenade: ${error}`);
    chatStates.delete(chatId);
  }
};

// Обработчик callback кнопок
const handleAdminCallbackQuery = async (callbackQuery) => {
  const chatId = callbackQuery.message.chat.id;
  const data = callbackQuery.data;

  // Проверка на админа
  const adminIds = getAdminIds();
  if (!adminIds.includes(chatId)) {
    bot.sendMessage(chatId, '❌ You don\'t have permission to use this function', { parse_mode: 'Markdown' });
    return;
  }

  try {

    if (data.startsWith('addsmoke_map_')) {
      const mapName = data.replace('addsmoke_map_', '');
      await handleAddSmokeMapSelection(callbackQuery, mapName);
    } else if (data.startsWith('addsmoke_side_')) {
      const side = data.replace('addsmoke_side_', '');
      await handleAddSmokeSideSelection(callbackQuery, side);
    } else if (data.startsWith('addsmoke_line_')) {
      const line = data.replace('addsmoke_line_', '');
      await handleAddSmokeLineSelection(callbackQuery, line);
    } else if (data.startsWith('addsmoke_grenade_')) {
      const grenadeType = data.replace('addsmoke_grenade_', '');
      await handleAddSmokeGrenadeSelection(callbackQuery, grenadeType);
    } else if (data.startsWith('addsmoke_difficulty_')) {
      const difficulty = data.replace('addsmoke_difficulty_', '');
      await handleAddSmokeDifficultySelection(callbackQuery, difficulty);
    } else if (data.startsWith('deletesmoke_map_')) {
      const mapName = data.replace('deletesmoke_map_', '');
      await handleDeleteSmokeMapSelection(callbackQuery, mapName);
    } else if (data.startsWith('deletesmoke_smoke_')) {
      const smokeId = data.replace('deletesmoke_smoke_', '');
      await handleDeleteSmokeSelectionCallback(callbackQuery, smokeId);
    } else if (data.startsWith('deletesmoke_confirm_')) {
      const smokeId = data.replace('deletesmoke_confirm_', '');
      await handleDeleteSmokeConfirm(callbackQuery, smokeId);
    } else if (data.startsWith('deletesmoke_cancel')) {
      await handleDeleteSmokeCancel(callbackQuery);
    } else if (data.startsWith('approve_suggestion_')) {
      const suggestionId = data.replace('approve_suggestion_', '');
      await handleApproveSuggestion(callbackQuery, suggestionId);
    } else if (data.startsWith('reject_suggestion_')) {
      const suggestionId = data.replace('reject_suggestion_', '');
      await handleRejectSuggestion(callbackQuery, suggestionId);
    } else if (data === 'back_to_suggestions') {
      await handleViewSuggestions(callbackQuery.message);
    } else {
      console.log('No matching admin callback handler found for:', data);
    }
  } catch (error) {
    console.error('Error handling callback query:', error);
    bot.sendMessage(chatId, '❌ Error occurred', { parse_mode: 'Markdown' });
  }
};

// Обработчик выбора карты для добавления смока
const handleAddSmokeMapSelection = async (callbackQuery, mapName) => {
  const chatId = callbackQuery.message.chat.id;
  const state = chatStates.get(chatId);

  if (!state) {
    bot.sendMessage(chatId, '❌ State not found', { parse_mode: 'Markdown' });
    return;
  }

  const selectedMap = state.maps.find(map => map.name === mapName);
  if (!selectedMap) {
    bot.sendMessage(chatId, '❌ Map not found', { parse_mode: 'Markdown' });
    return;
  }

  state.selectedMap = selectedMap;

  const keyboard = createKeyboard('addsmoke_side', SIDE_TYPES);
  const message = `🔴🔵 Choose a side

Info:
${getMapEmoji(mapName)} Map: ${getMapName(mapName)}`;

  bot.sendMessage(chatId, message, { parse_mode: 'Markdown', reply_markup: keyboard });
};

// Обработчик выбора стороны для добавления смока
const handleAddSmokeSideSelection = async (callbackQuery, side) => {
  const chatId = callbackQuery.message.chat.id;

  const state = chatStates.get(chatId);
  if (!state) {
    bot.sendMessage(chatId, '❌ State not found', { parse_mode: 'Markdown' });
    return;
  }

  state.side = side;

  const keyboard = createKeyboard('addsmoke_line', LINE_TYPES);
  const message = `Choose a line

Info:
${getMapEmoji(state.selectedMap.name)} Map: ${getMapName(state.selectedMap.name)}
${getSideEmoji(state.side)} Side: ${getSideName(state.side)}`;

  bot.sendMessage(chatId, message, { parse_mode: 'Markdown', reply_markup: keyboard });
};

// Обработчик выбора линии для добавления смока
const handleAddSmokeLineSelection = async (callbackQuery, line) => {
  const chatId = callbackQuery.message.chat.id;

  const state = chatStates.get(chatId);
  if (!state) {
    bot.sendMessage(chatId, '❌ State not found', { parse_mode: 'Markdown' });
    return;
  }

  state.line = line;
  const keyboard = createKeyboard('addsmoke_grenade', GRENADE_TYPES);
  const message = `Choose a grenade type

Info:
${getMapEmoji(state.selectedMap.name)} Map: ${getMapName(state.selectedMap.name)}
${getSideEmoji(state.side)} Side: ${getSideName(state.side)}
${getLineEmoji(state.line)} Line: ${getLineName(state.line)}`;

  bot.sendMessage(chatId, message, { parse_mode: 'Markdown', reply_markup: keyboard });
};

// Обработчик выбора типа гранаты для добавления смока
const handleAddSmokeGrenadeSelection = async (callbackQuery, grenadeType) => {
  const chatId = callbackQuery.message.chat.id;

  const state = chatStates.get(chatId);
  if (!state) {
    bot.sendMessage(chatId, '❌ State not found', { parse_mode: 'Markdown' });
    return;
  }

  state.grenadeType = grenadeType;
  const keyboard = createKeyboard('addsmoke_difficulty', DIFFICULTY_LEVELS);

  const message = `Selected:
${getMapEmoji(state.selectedMap.name)} Map: ${getMapName(state.selectedMap.name)}
${getSideEmoji(state.side)} Side: ${getSideName(state.side)}
${getLineEmoji(state.line)} Line: ${getLineName(state.line)}
${getGrenadeTypeEmoji(state.grenadeType)} Grenade type: ${getGrenadeTypeName(state.grenadeType)}`;

  bot.sendMessage(chatId, message, { parse_mode: 'Markdown', reply_markup: keyboard });
};

// Обработчик выбора сложности для добавления смока
const handleAddSmokeDifficultySelection = async (callbackQuery, difficulty) => {
  try {
    const chatId = callbackQuery.message.chat.id;
    const state = chatStates.get(chatId);

    if (!state) {
      bot.sendMessage(chatId, '❌ State not found', { parse_mode: 'Markdown' });
      return;
    }

    state.difficulty = difficulty;
    state.step = 'name';

    const message = `Selected:
${getMapEmoji(state.selectedMap.name)} Map: ${getMapName(state.selectedMap.name)}
${getSideEmoji(state.side)} Side: ${getSideName(state.side)}
${getLineEmoji(state.line)} Line: ${getLineName(state.line)}
${getGrenadeTypeEmoji(state.grenadeType)} Grenade type: ${getGrenadeTypeName(state.grenadeType)}
${getDifficultyEmoji(state.difficulty)} Difficulty: ${getDifficultyName(state.difficulty)}

Enter the name of the new smoke:`;

    bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
  } catch (error) {
    console.error('handleAddSmokeDifficultySelection error:', error);
    bot.sendMessage(chatId, '❌ Error occurred', { parse_mode: 'Markdown' });
  }
};


//////////////////////////////////////////////////////////////////////////

// Обработчик выбора карты для удаления смока
const handleDeleteSmokeMapSelection = async (callbackQuery, mapName) => {
  const chatId = callbackQuery.message.chat.id;
  const state = deleteStates.get(chatId);

  if (!state) {
    bot.sendMessage(chatId, '❌ State not found');
    return;
  }

  const selectedMap = state.maps.find(map => map.name === mapName) || { name: 'all' };

  if (!selectedMap && mapName !== 'all') {
    bot.sendMessage(chatId, '❌ Map not found');
    return;
  }

  state.selectedMap = selectedMap;
  state.step = 'select_smoke';

  try {
    const smokes = mapName === 'all' ? await getAllSmokes() : await getSmokesByMap(selectedMap.name);

    if (smokes.length === 0) {
      const message = `❌ No smokes found on ${selectedMap.name} for deletion.`;
      bot.sendMessage(chatId, message);
      deleteStates.delete(chatId);
      return;
    }

    // Создаем кнопки для выбора смока
    const keyboard = {
      inline_keyboard: smokes.map((smoke, index) => [{
        text: `${getDifficultyEmoji(smoke.difficulty)} ${smoke.name} (${getSideEmoji(smoke.side)} ${getLineEmoji(smoke.line)})`,
        callback_data: `deletesmoke_smoke_${smoke.id}`
      }])
    };

    const smokesMessage = `🗑 *Choose a smoke to delete on ${getMapName(selectedMap.name)}:*`;

    state.smokes = smokes;
    bot.sendMessage(chatId, smokesMessage, { parse_mode: 'Markdown', reply_markup: keyboard });
  } catch (error) {
    console.error('handleDeleteSmokeMapSelection error:', error);
    bot.sendMessage(chatId, '❌ Error getting smokes');
    deleteStates.delete(chatId);
  }
};

// Обработчик выбора смока для удаления (callback)
const handleDeleteSmokeSelectionCallback = async (callbackQuery, smokeId) => {
  const chatId = callbackQuery.message.chat.id;

  const state = deleteStates.get(chatId);
  if (!state) {
    bot.sendMessage(chatId, '❌ State not found');
    return;
  }

  const selectedSmoke = state.smokes.find(smoke => smoke.id == smokeId);
  if (!selectedSmoke) {
    bot.sendMessage(chatId, '❌ Smoke not found');
    return;
  }

  state.selectedSmoke = selectedSmoke;
  state.step = 'confirm_delete';

  // Создаем кнопки для подтверждения
  const keyboard = {
    inline_keyboard: [
      [{ text: '✅ Yes, delete', callback_data: `deletesmoke_confirm_${smokeId}` }],
      [{ text: '❌ Cancel', callback_data: 'deletesmoke_cancel' }]
    ]
  };

  const confirmMessage = `⚠️ *Confirm deletion*

${selectedSmoke.name} Grenade: ${selectedSmoke.name}
${getMapEmoji(state.selectedMap.name)} Map: ${getMapName(state.selectedMap.name)}
${getDifficultyEmoji(selectedSmoke.difficulty)} Difficulty: ${getDifficultyName(selectedSmoke.difficulty)}
${getSideEmoji(selectedSmoke.side)} Side: ${getSideName(selectedSmoke.side)}
${selectedSmoke.line ? getLineEmoji(selectedSmoke.line) : 'Not specified'} Line: ${getLineName(selectedSmoke.line)}

*Instructions:* ${escapeMarkdown(selectedSmoke.lineup_instructions)}

⚠️ *This action cannot be undone!*`;

  bot.sendMessage(chatId, confirmMessage, { parse_mode: 'Markdown', reply_markup: keyboard });
};

// Обработчик подтверждения удаления
const handleDeleteSmokeConfirm = async (callbackQuery, smokeId) => {
  const chatId = callbackQuery.message.chat.id;
  const state = deleteStates.get(chatId);
  if (!state) {
    bot.sendMessage(chatId, '❌ State not found');
    return;
  }

  try {
    const deletedCount = await deleteSmoke(smokeId);

    if (deletedCount > 0) {
      const successMessage = `✅ Grenade successfully deleted!

*Deleted grenade:* ${state.selectedSmoke.name}
*Map:* ${state.selectedMap.name}

Use /deletesmoke to delete other grenades.`;

      bot.sendMessage(chatId, successMessage, { parse_mode: 'Markdown' });
    } else {
      bot.sendMessage(chatId, '❌ Error deleting grenade.');
    }
  } catch (error) {
    bot.sendMessage(chatId, `❌ Error deleting grenade: ${error.message}`);

  } finally {
    deleteStates.delete(chatId);
  }
};

const handleDeleteSmokeCancel = async (callbackQuery) => {
  const chatId = callbackQuery.message.chat.id;
  deleteStates.delete(chatId);
  bot.deleteMessage(chatId, callbackQuery.message.message_id);
};

// Обработчик команды /suggestgrenade


// Обработчик команды /viewsuggestions
const handleViewSuggestions = async (msg) => {
  const chatId = msg.chat.id;
  const adminIds = getAdminIds();

  if (!adminIds.includes(chatId)) {
    const message = `❌ You don't have permission to view suggestions`;
    bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
    return;
  }

  try {
    const suggestedSmokes = await getAllSuggestedSmokes();

    if (suggestedSmokes.length === 0) {
      bot.sendMessage(chatId, '📭 No suggested grenades found.', { parse_mode: 'Markdown' });
      return;
    }

    let message = `📋 *Suggested Grenades (${suggestedSmokes.length}):*\n\n`;

    suggestedSmokes.forEach((smoke, index) => {
      const difficulty = getDifficultyEmoji(smoke.difficulty);
      const side = getSideEmoji(smoke.side);
      const line = getLineEmoji(smoke.line);
      const grenadeType = getGrenadeTypeEmoji(smoke.grenade_type);

      message += `${index + 1}. *${escapeMarkdown(smoke.name)}* ${difficulty} ${side} ${line} ${grenadeType}\n`;
      message += `   📍 ${escapeMarkdown(smoke.map_display_name)}\n`;
      message += `   👤 By: ${escapeMarkdown(smoke.username || 'Unknown')}\n`;
      message += `   📅 ${new Date(smoke.suggested_at).toLocaleDateString()}\n\n`;
    });

    message += 'Send a number to view details and approve/reject:';

    bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
  } catch (error) {
    console.error('Error in handleViewSuggestions:', error);
    bot.sendMessage(chatId, '❌ Error getting suggested grenades. Please try again.');
  }
};

// Обработчик выбора предложенной гранаты для просмотра
const handleSuggestionSelection = async (msg) => {
  const chatId = msg.chat.id;
  const text = msg.text;
  const adminIds = getAdminIds();

  if (!adminIds.includes(chatId)) {
    return;
  }

  try {
    const suggestedSmokes = await getAllSuggestedSmokes();
    const suggestionIndex = parseInt(text) - 1;

    if (suggestionIndex < 0 || suggestionIndex >= suggestedSmokes.length) {
      bot.sendMessage(chatId, '❌ Invalid suggestion number. Try again.');
      return;
    }

    const selectedSuggestion = suggestedSmokes[suggestionIndex];
    const mediaFiles = await getSuggestedSmokeMedia(selectedSuggestion.id);

    const message = `📋 *Suggestion Details*

*Grenade:* ${escapeMarkdown(selectedSuggestion.name)}
*Map:* ${escapeMarkdown(selectedSuggestion.map_display_name)}
*Difficulty:* ${getDifficultyEmoji(selectedSuggestion.difficulty)} ${selectedSuggestion.difficulty}
*Side:* ${getSideEmoji(selectedSuggestion.side)} ${selectedSuggestion.side}
*Line:* ${selectedSuggestion.line ? getLineEmoji(selectedSuggestion.line) : 'Not specified'}
*Grenade Type:* ${getGrenadeTypeEmoji(selectedSuggestion.grenade_type)} ${selectedSuggestion.grenade_type}

*Instructions:*
${escapeMarkdown(selectedSuggestion.lineup_instructions)}

*Submitted by:* ${escapeMarkdown(selectedSuggestion.username || 'Unknown')}
*Date:* ${new Date(selectedSuggestion.suggested_at).toLocaleString()}
*Media files:* ${mediaFiles.length}`;

    const keyboard = {
      inline_keyboard: [
        [{ text: '✅ Approve', callback_data: `approve_suggestion_${selectedSuggestion.id}` }],
        [{ text: '❌ Reject', callback_data: `reject_suggestion_${selectedSuggestion.id}` }],
        [{ text: '🔙 Back to list', callback_data: 'back_to_suggestions' }]
      ]
    };

    bot.sendMessage(chatId, message, { parse_mode: 'Markdown', reply_markup: keyboard });

  } catch (error) {
    console.error('Error in handleSuggestionSelection:', error);
    bot.sendMessage(chatId, '❌ Error getting suggestion details.');
  }
};

// Обработчик одобрения предложения
const handleApproveSuggestion = async (callbackQuery, suggestionId) => {
  const chatId = callbackQuery.message.chat.id;
  const adminIds = getAdminIds();

  if (!adminIds.includes(chatId)) {
    bot.sendMessage(chatId, '❌ You don\'t have permission to approve suggestions', { parse_mode: 'Markdown' });
    return;
  }

  try {
    const suggestion = await getSuggestedSmokeById(suggestionId);
    if (!suggestion) {
      bot.sendMessage(chatId, '❌ Suggestion not found.', { parse_mode: 'Markdown' });
      return;
    }

    const newSmokeId = await approveSuggestedSmoke(suggestionId);

    if (newSmokeId) {
      const successMessage = `✅ *Suggestion approved successfully!*

*Grenade:* ${escapeMarkdown(suggestion.name)}
*Map:* ${escapeMarkdown(suggestion.map_display_name)}
*Difficulty:* ${getDifficultyEmoji(suggestion.difficulty)} ${suggestion.difficulty}
*Side:* ${getSideEmoji(suggestion.side)} ${suggestion.side}
*Line:* ${suggestion.line ? getLineEmoji(suggestion.line) : 'Not specified'}
*Grenade Type:* ${getGrenadeTypeEmoji(suggestion.grenade_type)} ${suggestion.grenade_type}

*Instructions:*
${escapeMarkdown(suggestion.lineup_instructions)}

*Submitted by:* ${escapeMarkdown(suggestion.username || 'Unknown')}
*Date:* ${new Date(suggestion.suggested_at).toLocaleString()}

The grenade has been added to the main database.`;

      bot.sendMessage(chatId, successMessage, { parse_mode: 'Markdown' });
    } else {
      bot.sendMessage(chatId, '❌ Error approving suggestion.', { parse_mode: 'Markdown' });
    }
  } catch (error) {
    console.error('Error approving suggestion:', error);
    bot.sendMessage(chatId, `❌ Error approving suggestion: ${error.message}`, { parse_mode: 'Markdown' });
  }
};

// Обработчик отклонения предложения
const handleRejectSuggestion = async (callbackQuery, suggestionId) => {
  const chatId = callbackQuery.message.chat.id;
  const adminIds = getAdminIds();

  if (!adminIds.includes(chatId)) {
    bot.sendMessage(chatId, '❌ You don\'t have permission to reject suggestions', { parse_mode: 'Markdown' });
    return;
  }

  try {
    const suggestion = await getSuggestedSmokeById(suggestionId);
    if (!suggestion) {
      bot.sendMessage(chatId, '❌ Suggestion not found.', { parse_mode: 'Markdown' });
      return;
    }

    const deletedCount = await rejectSuggestedSmoke(suggestionId);

    if (deletedCount > 0) {
      const successMessage = `❌ *Suggestion rejected successfully!*

*Grenade:* ${escapeMarkdown(suggestion.name)}
*Map:* ${escapeMarkdown(suggestion.map_display_name)}
*Difficulty:* ${getDifficultyEmoji(suggestion.difficulty)} ${suggestion.difficulty}
*Side:* ${getSideEmoji(suggestion.side)} ${suggestion.side}
*Line:* ${suggestion.line ? getLineEmoji(suggestion.line) : 'Not specified'}
*Grenade Type:* ${getGrenadeTypeEmoji(suggestion.grenade_type)} ${suggestion.grenade_type}

*Instructions:*
${escapeMarkdown(suggestion.lineup_instructions)}

*Submitted by:* ${escapeMarkdown(suggestion.username || 'Unknown')}
*Date:* ${new Date(suggestion.suggested_at).toLocaleString()}

The suggestion has been removed from the database.`;

      bot.sendMessage(chatId, successMessage, { parse_mode: 'Markdown' });
    } else {
      bot.sendMessage(chatId, '❌ Error rejecting suggestion.', { parse_mode: 'Markdown' });
    }
  } catch (error) {
    console.error('Error rejecting suggestion:', error);
    bot.sendMessage(chatId, `❌ Error rejecting suggestion: ${error.message}`, { parse_mode: 'Markdown' });
  }
};


module.exports = {
  setAdminBot,
  handleAddSmoke,
  handleDeleteSmoke,
  handleReset,
  handleAdminMessage,
  handleAdminCallbackQuery,
  handlePhoto,
  handleVideo,
  handleMediaGroup,
  handleViewSuggestions,
  handleSuggestionSelection
};