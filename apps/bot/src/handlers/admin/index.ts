import type { TelegramBot, BotMessage, BotCallbackQuery } from '../../utils/bot';
import {
  addSmoke,
  saveSmokeImage,
  getMaps,
  getSmokesByMap,
  deleteSmoke,
  getAllSmokes,
  getAllSuggestedSmokes,
  getSuggestedSmokeMedia,
  approveSuggestedSmoke,
  rejectSuggestedSmoke,
  getSuggestedSmokeById,
} from '@shared/database';

import {
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
  DIFFICULTY_LEVELS,
} from '@shared/config/constants';

import { debounce } from 'lodash';

import type {
  AddSmokeState,
  DeleteSmokeState,
  MediaGroupState,
  SuggestedMediaFile,
  NewSmokeInput,
} from '@shared/utils/types';

import {
  isMapKey,
  isSideKey,
  isLineKey,
  isGrenadeTypeKey,
  isDifficultyKey,
  resolveChatId,
} from '@shared/utils/guards';

let lastMessageId: number[] = [];

// Функция для получения списка админов из переменных окружения
export const getAdminIds = () => {
  const adminIdsStr = process.env.ADMIN_IDS;
  if (!adminIdsStr) {
    console.error('ADMIN_IDS not found in environment variables, using default admin ID');
    return [226529821]; // Fallback к дефолтному админу
  }
  return adminIdsStr.split(',').map(id => parseInt(id.trim())).filter(id => !isNaN(id));
};

// Глобальная переменная для бота
let bot!: TelegramBot;

// Функция для установки экземпляра бота
export const setAdminBot = (botInstance: TelegramBot) => {
  bot = botInstance;
};

// Состояния пользователей для добавления смоков
const chatStates = new Map<number, AddSmokeState>();

// Состояния пользователей для удаления смоков
const deleteStates = new Map<number, DeleteSmokeState>();

// Хранилище для медиагрупп
const mediaGroupStorage = new Map<string, MediaGroupState>();

// Обработчик команды /addsmoke
export const handleAddSmoke = async (msg: BotMessage) => {
  const chatId = msg.chat.id;
  const adminIds = getAdminIds();

  if (!adminIds.includes(chatId)) {
    const message = `❌ You don't have permission to add grenades`;
    bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
    return;
  }

  try {
    const maps = await getMaps();
    const message = `🗺 Choose a map to add smoke:`;
    const keyboard = createKeyboard('addsmoke_map', Object.fromEntries(Object.entries(MAP_TYPES).filter(([key]) => key !== 'all')));

    chatStates.set(chatId, {
      chatId,
      maps,
      step: null,
    });
    deleteStates.delete(chatId);
    bot.sendMessage(chatId, message, { parse_mode: 'Markdown', reply_markup: keyboard });
  } catch (error) {
    console.error('Error in handleAddSmoke:', error);
    bot.sendMessage(chatId, '❌ Error getting maps list. Please try again.');
  }
};

// Обработчик команды /deletesmoke
export const handleDeleteSmoke = async (msg: BotMessage) => {
  const chatId = msg.chat.id;
  const adminIds = getAdminIds();

  if (!adminIds.includes(chatId)) {
    const noAccessMessage = `❌ You don't have permission to delete grenades`;
    bot.sendMessage(chatId, noAccessMessage, { parse_mode: 'Markdown' });
    return;
  }

  try {
    const maps = await getMaps();
    const keyboard = createKeyboard('deletesmoke_map', MAP_TYPES);
    const mapsMessage = 'Choose a map to delete smoke:';

    deleteStates.set(chatId, {
      step: 'select_map',
      maps,
      chatId
    });
    chatStates.delete(chatId);

    bot.sendMessage(chatId, mapsMessage, { parse_mode: 'Markdown', reply_markup: keyboard });
  } catch (error) {
    console.error('Error in handleDeleteSmoke:', error);
    bot.sendMessage(chatId, '❌ Error getting maps list. Please try again.');
  }
};

// Обработчик команды /reset
export const handleReset = async (msg: BotMessage) => {
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
export const handleAdminMessage = async (msg: BotMessage) => {
  const chatId = msg.chat.id;
  const text = msg.text ?? '';

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
export const handleSmokeNameSelection = async (msg: BotMessage, text: string) => {
  const chatId = msg.chat.id;
  const state = chatStates.get(chatId);
  if (!state) {
    bot.sendMessage(chatId, '❌ State not found', { parse_mode: 'Markdown' });
    return;
  }
  state.name = text;
  state.step = 'instructions';
  bot.sendMessage(chatId, 'Enter smoke setup instructions:');
};

// Функция для отправки запроса на изображение/видео
export const sendImagePrompt = async (chatId: number) => {
  const message = `📸 Send smoke image/video:

Recommendations:
• Format: JPG, PNG, MP4
• Size: up to 10MB
• Content: screenshot with instructions
• You can send multiple files at once`;

  bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
};

// Обработчик инструкций смока
export const handleSmokeInstructionsSelection = async (msg: BotMessage, text: string) => {
  const chatId = msg.chat.id;
  const state = chatStates.get(chatId);
  if (!state) {
    bot.sendMessage(chatId, '❌ State not found', { parse_mode: 'Markdown' });
    return;
  }
  state.lineup_instructions = text;
  state.step = 'image';
  await sendImagePrompt(chatId); // Вызываем новую функцию для отправки запроса
};

// Обработчик фото
export const handlePhoto = async (msg: BotMessage) => {
  const chatId = msg.chat.id;
  const mediaGroupId = msg.media_group_id;
  const state = chatStates.get(chatId);

  if (!state || state.step !== 'image') {
    return; // Игнорируем фото, если не в процессе добавления гранаты
  }

  if (!msg.photo?.length) {
    return;
  }

  // Инициализируем хранилище для медиагруппы
  if (mediaGroupId && !mediaGroupStorage.has(mediaGroupId)) {
    mediaGroupStorage.set(mediaGroupId, {
      chatId,
      mediaGroupId,
      files: [],
      expectedCount: 0,
      receivedCount: 0
    });
  }

  const photo = msg.photo[msg.photo.length - 1]; // Берем самое большое фото
  const fileId = photo.file_id;

  // Проверяем, является ли это частью медиагруппы
  if (mediaGroupId) {
    await handleMediaGroupFile(chatId, mediaGroupId, { type: 'photo', fileId, caption: state.lineup_instructions ?? null });
    await processCompleteMediaGroup(mediaGroupId);
  } else {
    state.step = null;
    await saveSmokeToDatabase(state, [{
      type: 'photo',
      fileId,
      caption: state.lineup_instructions ?? null
    }]);
  }
};

// Обработчик видео
export const handleVideo = async (msg: BotMessage) => {
  const chatId = msg.chat.id;
  const mediaGroupId = msg.media_group_id;
  const state = chatStates.get(chatId);

  if (!state || state.step !== 'image') {
    return; // Игнорируем видео, если не в процессе добавления гранаты
  }

  const fileId = msg.video?.file_id;

  if (!fileId) {
    return;
  }

  // Проверяем, является ли это частью медиагруппы
  if (mediaGroupId) {
    await handleMediaGroupFile(chatId, mediaGroupId, { type: 'video', fileId, caption: state.lineup_instructions ?? null });
    await processCompleteMediaGroup(mediaGroupId);
  } else {
    // Одиночное видео
    state.step = null;
    await saveSmokeToDatabase(state, [{ type: 'video', fileId, caption: state.lineup_instructions ?? null }]);
  }
};

// Обработчик медиагруппы
export const handleMediaGroup = async (messages: BotMessage[]) => {
  const msg = messages[0];
  const chatId = msg.chat.id;
  const mediaGroupId = msg.media_group_id;
  const state = chatStates.get(chatId);

  if (!state || state.step !== 'image') {
    return; // Игнорируем медиагруппу, если не в процессе добавления гранаты
  }

  if (!mediaGroupId) {
    return;
  }

  // Инициализируем хранилище для медиагруппы
  if (!mediaGroupStorage.has(mediaGroupId)) {
    mediaGroupStorage.set(mediaGroupId, {
      chatId,
      mediaGroupId,
      files: [],
      expectedCount: messages.length,
      receivedCount: 0
    });
  }

  const groupData = mediaGroupStorage.get(mediaGroupId);

  if (!groupData) {
    return;
  }

  // Отправляем сообщение о начале обработки медиагруппы
  if (groupData.receivedCount === 0) {
    bot.sendMessage(chatId, '📸 Processing media group... Please wait for all files to be received.');
  }
};

// Обработчик файла из медиагруппы
export const handleMediaGroupFile = async (chatId: number, mediaGroupId: string, fileData: SuggestedMediaFile) => {
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
export const processCompleteMediaGroup = debounce(async (mediaGroupId: string) => {
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
export const handleDeleteMapSelection = async (msg: BotMessage, text: string) => {
  const chatId = msg.chat.id;
  const state = deleteStates.get(chatId);

  if (!state) {
    bot.sendMessage(chatId, '❌ State not found', { parse_mode: 'Markdown' });
    return;
  }

  let selectedMap = null;

  // Проверяем номер карты
  const mapIndex = Number.parseInt(text, 10) - 1;
  if (!Number.isNaN(mapIndex) && mapIndex >= 0 && mapIndex < state.maps.length) {
    selectedMap = state.maps[mapIndex];
  } else {
    // Проверяем название карты
    selectedMap = state.maps.find((map) => map.name === text);
  }

  const isAllSelection = text === 'all';

  if (!selectedMap && !isAllSelection) {
    bot.sendMessage(chatId, '❌ Invalid map selection. Try again.');
    return;
  }

  state.selectedMap = selectedMap ?? undefined;
  state.selectedMapLabel = selectedMap?.display_name ?? 'All maps';
  state.step = 'select_smoke';

  try {
    const smokes = isAllSelection
      ? await getAllSmokes()
      : await getSmokesByMap(selectedMap!.name);

    if (smokes.length === 0) {
      const mapDisplay = escapeMarkdown(state.selectedMapLabel ?? 'the selected map');
      bot.sendMessage(chatId, `❌ No smokes found on ${mapDisplay} for deletion!`);
      deleteStates.delete(chatId);
      return;
    }

    const mapDisplay = escapeMarkdown(state.selectedMapLabel ?? 'All maps');
    let smokesMessage = `🗑 *Choose a smoke to delete on ${mapDisplay}:*`;

    smokes.forEach((smoke, index) => {
      const difficulty = getDifficultyEmoji(smoke.difficulty);
      const side = getSideEmoji(smoke.side);
      const line = getLineEmoji(smoke.line ?? 'all');

      smokesMessage += `${index + 1}. *${escapeMarkdown(smoke.name)}* ${difficulty} ${side} ${line}`;
      smokesMessage += `   📋 ${escapeMarkdown(smoke.lineup_instructions)}`;
    });

    smokesMessage += 'Send a number for smoke deletion or "cancel" to exit:';

    state.smokes = smokes;
    bot.sendMessage(chatId, smokesMessage, { parse_mode: 'Markdown' });

  } catch (error) {
    const fallbackMessage = error instanceof Error ? error.message : 'Unknown error';
    bot.sendMessage(chatId, `❌ Error getting smokes: ${fallbackMessage}`);
    deleteStates.delete(chatId);
  }
};

// Обработчик выбора смока для удаления
export const handleDeleteSmokeSelection = async (msg: BotMessage, text: string) => {
  const chatId = msg.chat.id;
  const state = deleteStates.get(chatId);

  if (!state || !state.smokes) {
    bot.sendMessage(chatId, '❌ State not found', { parse_mode: 'Markdown' });
    return;
  }

  if (text.toLowerCase() === 'cancel') {
    bot.sendMessage(chatId, '❌ Deletion cancelled.');
    deleteStates.delete(chatId);
    return;
  }

  const smokeIndex = Number.parseInt(text, 10) - 1;
  if (Number.isNaN(smokeIndex) || smokeIndex < 0 || smokeIndex >= state.smokes.length) {
    bot.sendMessage(chatId, '❌ Invalid grenade number. Try again.');
    return;
  }

  const selectedSmoke = state.smokes[smokeIndex];
  state.selectedSmoke = selectedSmoke;
  state.step = 'confirm_delete';

  const confirmMessage = `
⚠️ *Confirm deletion*

*Grenade:* ${selectedSmoke.name}
*Map:* ${escapeMarkdown(state.selectedMapLabel ?? state.selectedMap?.display_name ?? 'All maps')}
*Difficulty:* ${getDifficultyEmoji(selectedSmoke.difficulty)} ${selectedSmoke.difficulty}
*Side:* ${getSideEmoji(selectedSmoke.side)} ${selectedSmoke.side}
*Line:* ${selectedSmoke.line ? getLineEmoji(selectedSmoke.line) : 'Not specified'}

*Instructions:* ${escapeMarkdown(selectedSmoke.lineup_instructions)}

⚠️ *This action cannot be undone!*

Send "YES" to confirm deletion or "NO" to cancel:
  `;

  bot.sendMessage(chatId, confirmMessage, { parse_mode: 'Markdown' });
};

// Обработчик подтверждения удаления
export const handleConfirmDelete = async (msg: BotMessage, text: string) => {
  const chatId = msg.chat.id;
  const state = deleteStates.get(chatId);

  if (!state || !state.selectedSmoke) {
    bot.sendMessage(chatId, '❌ State not found', { parse_mode: 'Markdown' });
    deleteStates.delete(chatId);
    return;
  }

  if (text.trim().toLowerCase() === 'yes') {
    try {
      const deletedCount = await deleteSmoke(state.selectedSmoke.id);

      if (deletedCount > 0) {
        const successMessage = `
✅ Grenade successfully deleted!

*Deleted grenade:* ${escapeMarkdown(state.selectedSmoke.name)}
*Map:* ${escapeMarkdown(state.selectedMapLabel ?? state.selectedMap?.display_name ?? 'All maps')}

Use /deletesmoke to delete other grenades.        `;
        bot.sendMessage(chatId, successMessage, { parse_mode: 'Markdown' });
      } else {
        bot.sendMessage(chatId, '❌ Error deleting grenade.');
      }
    } catch (error) {
      const fallbackMessage = error instanceof Error ? error.message : 'Unknown error';
      bot.sendMessage(chatId, `❌ Error deleting grenade: ${fallbackMessage}`);
    }
  } else {
    bot.sendMessage(chatId, '❌ Deletion cancelled.');
  }

  // Очищаем состояние
  deleteStates.delete(chatId);
};

// Сохранение смока в базу данных
export const saveSmokeToDatabase = async (state: AddSmokeState, mediaFiles: SuggestedMediaFile[]) => {
  const chatId = state.chatId;

  if (!state.selectedMap || !state.side || !state.line || !state.grenadeType || !state.difficulty || !state.name || !state.lineup_instructions) {
    bot.sendMessage(chatId, '❌ Incomplete smoke data. Please restart the process.', { parse_mode: 'Markdown' });
    chatStates.delete(chatId);
    return;
  }

  try {
    const smokePayload: NewSmokeInput = {
      name: state.name,
      lineup_instructions: state.lineup_instructions,
      difficulty: state.difficulty,
      side: state.side,
      line: state.line,
      grenadeType: state.grenadeType,
      imageUrl: null,
    };

    const smokeId = await addSmoke(state.selectedMap.name, smokePayload);

    if (mediaFiles.length > 0) {
      for (const file of mediaFiles) {
        await saveSmokeImage(smokeId, file.fileId, file.type, file.caption ?? state.lineup_instructions);
      }
    }

    const successMessage = `Grenade successfully added!

Name: ${escapeMarkdown(state.name)}
Instructions: ${escapeMarkdown(state.lineup_instructions)}

====================================

${getMapEmoji(state.selectedMap.name)} Map: ${state.selectedMap.display_name}
${getSideEmoji(state.side)} Side: ${getSideName(state.side)}
${getLineEmoji(state.line)} Line: ${getLineName(state.line)}
${getGrenadeTypeEmoji(state.grenadeType)} Grenade type: ${getGrenadeTypeName(state.grenadeType)}
${getDifficultyEmoji(state.difficulty)} Difficulty: ${getDifficultyName(state.difficulty)}`;

    bot.sendMessage(chatId, successMessage, { parse_mode: 'Markdown' });
    chatStates.delete(chatId);
  } catch (error) {
    const fallbackMessage = error instanceof Error ? error.message : 'Unknown error';
    bot.sendMessage(chatId, `Error saving grenade: ${fallbackMessage}`);
    chatStates.delete(chatId);
  }
};

// Обработчик callback кнопок
export const handleAdminCallbackQuery = async (callbackQuery: BotCallbackQuery) => {
  const chatId = resolveChatId(callbackQuery);
  const data = callbackQuery.data ?? '';

  if (chatId === undefined) {
    return;
  }

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
      const smokeId = Number.parseInt(data.replace('deletesmoke_smoke_', ''), 10);
      if (Number.isNaN(smokeId)) {
        bot.sendMessage(chatId, '❌ Invalid smoke identifier', { parse_mode: 'Markdown' });
      } else {
        await handleDeleteSmokeSelectionCallback(callbackQuery, smokeId);
      }
    } else if (data.startsWith('deletesmoke_confirm_')) {
      const smokeId = Number.parseInt(data.replace('deletesmoke_confirm_', ''), 10);
      if (Number.isNaN(smokeId)) {
        bot.sendMessage(chatId, '❌ Invalid smoke identifier', { parse_mode: 'Markdown' });
      } else {
        await handleDeleteSmokeConfirm(callbackQuery, smokeId);
      }
    } else if (data === 'deletesmoke_cancel') {
      await handleDeleteSmokeCancel(callbackQuery);
    } else if (data.startsWith('approve_suggestion_')) {
      const suggestionId = Number.parseInt(data.replace('approve_suggestion_', ''), 10);
      if (Number.isNaN(suggestionId)) {
        bot.sendMessage(chatId, '❌ Invalid suggestion identifier', { parse_mode: 'Markdown' });
      } else {
        await handleApproveSuggestion(callbackQuery, suggestionId);
      }
    } else if (data.startsWith('reject_suggestion_')) {
      const suggestionId = Number.parseInt(data.replace('reject_suggestion_', ''), 10);
      if (Number.isNaN(suggestionId)) {
        bot.sendMessage(chatId, '❌ Invalid suggestion identifier', { parse_mode: 'Markdown' });
      } else {
        await handleRejectSuggestion(callbackQuery, suggestionId);
      }
    } else if (data === 'back_to_suggestions') {
      const messageContext = callbackQuery.message;
      if (messageContext) {
        await handleViewSuggestions(messageContext);
      }
    } else {
      console.log('No matching admin callback handler found for:', data);
    }
  } catch (error) {
    console.error('Error handling callback query:', error);
    bot.sendMessage(chatId, '❌ Error occurred', { parse_mode: 'Markdown' });
  }
};

// Обработчик выбора карты для добавления смока
export const handleAddSmokeMapSelection = async (callbackQuery: BotCallbackQuery, mapName: string) => {
  const chatId = resolveChatId(callbackQuery);

  if (chatId === undefined) {
    return;
  }

  const state = chatStates.get(chatId);

  if (!state) {
    bot.sendMessage(chatId, '❌ State not found', { parse_mode: 'Markdown' });
    return;
  }

  if (!isMapKey(mapName)) {
    bot.sendMessage(chatId, '❌ Map not found', { parse_mode: 'Markdown' });
    return;
  }

  const selectedMap = state.maps.find((map) => map.name === mapName);
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
export const handleAddSmokeSideSelection = async (callbackQuery: BotCallbackQuery, side: string) => {
  const chatId = resolveChatId(callbackQuery);

  if (chatId === undefined) {
    return;
  }

  const state = chatStates.get(chatId);
  if (!state || !state.selectedMap) {
    bot.sendMessage(chatId, '❌ State not found', { parse_mode: 'Markdown' });
    return;
  }

  if (!isSideKey(side)) {
    bot.sendMessage(chatId, '❌ Invalid side', { parse_mode: 'Markdown' });
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
export const handleAddSmokeLineSelection = async (callbackQuery: BotCallbackQuery, line: string) => {
  const chatId = resolveChatId(callbackQuery);

  if (chatId === undefined) {
    return;
  }

  const state = chatStates.get(chatId);
  if (!state || !state.selectedMap || !state.side) {
    bot.sendMessage(chatId, '❌ State not found', { parse_mode: 'Markdown' });
    return;
  }

  if (!isLineKey(line)) {
    bot.sendMessage(chatId, '❌ Invalid line', { parse_mode: 'Markdown' });
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
export const handleAddSmokeGrenadeSelection = async (callbackQuery: BotCallbackQuery, grenadeType: string) => {
  const chatId = resolveChatId(callbackQuery);

  if (chatId === undefined) {
    return;
  }

  const state = chatStates.get(chatId);
  if (!state || !state.selectedMap || !state.side || !state.line) {
    bot.sendMessage(chatId, '❌ State not found', { parse_mode: 'Markdown' });
    return;
  }

  if (!isGrenadeTypeKey(grenadeType) || grenadeType === 'all') {
    bot.sendMessage(chatId, '❌ Invalid grenade type', { parse_mode: 'Markdown' });
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
export const handleAddSmokeDifficultySelection = async (callbackQuery: BotCallbackQuery, difficulty: string) => {
  const chatId = resolveChatId(callbackQuery);

  if (chatId === undefined) {
    return;
  }

  try {
    const state = chatStates.get(chatId);

    if (!state || !state.selectedMap || !state.side || !state.line || !state.grenadeType) {
      bot.sendMessage(chatId, '❌ State not found', { parse_mode: 'Markdown' });
      return;
    }

    if (!isDifficultyKey(difficulty) || difficulty === 'all') {
      bot.sendMessage(chatId, '❌ Invalid difficulty', { parse_mode: 'Markdown' });
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
export const handleDeleteSmokeMapSelection = async (callbackQuery: BotCallbackQuery, mapName: string) => {
  const chatId = resolveChatId(callbackQuery);

  if (chatId === undefined) {
    return;
  }

  const state = deleteStates.get(chatId);

  if (!state) {
    bot.sendMessage(chatId, '❌ State not found');
    return;
  }

  const isAllSelection = mapName === 'all';
  const selectedMap = state.maps.find((map) => map.name === mapName);

  if (!selectedMap && !isAllSelection) {
    bot.sendMessage(chatId, '❌ Map not found');
    return;
  }

  state.selectedMap = selectedMap ?? undefined;
  state.selectedMapLabel = selectedMap?.display_name ?? 'All maps';
  state.step = 'select_smoke';

  try {
    const smokes = isAllSelection
      ? await getAllSmokes()
      : await getSmokesByMap(selectedMap!.name);

    if (smokes.length === 0) {
      bot.sendMessage(chatId, '❌ No smokes found on this map');
      deleteStates.delete(chatId);
      return;
    }

    state.smokes = smokes;

    const keyboard = {
      inline_keyboard: smokes.map((smoke) => [{
        text: `${getDifficultyEmoji(smoke.difficulty)} ${smoke.name} (${getSideEmoji(smoke.side)} ${getLineEmoji(smoke.line ?? 'all')})`,
        callback_data: `deletesmoke_smoke_${smoke.id}`
      }])
    };

    const smokesMessage = `🗑 *Choose a smoke to delete on ${state.selectedMapLabel}:*`;

    bot.sendMessage(chatId, smokesMessage, { parse_mode: 'Markdown', reply_markup: keyboard });
  } catch (error) {
    console.error('handleDeleteSmokeMapSelection error:', error);
    bot.sendMessage(chatId, '❌ Error getting smokes');
    deleteStates.delete(chatId);
  }
};

// Обработчик выбора смока для удаления (callback)
export const handleDeleteSmokeSelectionCallback = async (callbackQuery: BotCallbackQuery, smokeId: number) => {
  const chatId = resolveChatId(callbackQuery);

  if (chatId === undefined) {
    return;
  }

  const state = deleteStates.get(chatId);
  if (!state || !state.smokes) {
    bot.sendMessage(chatId, '❌ State not found');
    return;
  }

  const selectedSmoke = state.smokes.find((smoke) => smoke.id === smokeId);
  if (!selectedSmoke) {
    bot.sendMessage(chatId, '❌ Smoke not found');
    return;
  }

  state.selectedSmoke = selectedSmoke;
  state.step = 'confirm_delete';

  const keyboard = {
    inline_keyboard: [
      [{ text: '✅ Yes, delete', callback_data: `deletesmoke_confirm_${smokeId}` }],
      [{ text: '❌ Cancel', callback_data: 'deletesmoke_cancel' }]
    ]
  };

  const mapLabel = state.selectedMapLabel ?? state.selectedMap?.display_name ?? 'All maps';
  const mapEmoji = state.selectedMap ? getMapEmoji(state.selectedMap.name) : '🌐';
  const lineEmoji = selectedSmoke.line ? getLineEmoji(selectedSmoke.line) : '➖';
  const lineName = selectedSmoke.line ? getLineName(selectedSmoke.line) : 'Not specified';

  const confirmMessage = `⚠️ *Confirm deletion*

${escapeMarkdown(selectedSmoke.name)} Grenade: ${escapeMarkdown(selectedSmoke.name)}
${mapEmoji} Map: ${escapeMarkdown(mapLabel)}
${getDifficultyEmoji(selectedSmoke.difficulty)} Difficulty: ${getDifficultyName(selectedSmoke.difficulty)}
${getSideEmoji(selectedSmoke.side)} Side: ${getSideName(selectedSmoke.side)}
${lineEmoji} Line: ${lineName}

*Instructions:* ${escapeMarkdown(selectedSmoke.lineup_instructions)}

⚠️ *This action cannot be undone!*`;

  bot.sendMessage(chatId, confirmMessage, { parse_mode: 'Markdown', reply_markup: keyboard });
};

// Обработчик подтверждения удаления
export const handleDeleteSmokeConfirm = async (callbackQuery: BotCallbackQuery, smokeId: number) => {
  const chatId = resolveChatId(callbackQuery);

  if (chatId === undefined) {
    return;
  }

  const state = deleteStates.get(chatId);
  if (!state) {
    bot.sendMessage(chatId, '❌ State not found');
    return;
  }

  try {
    const deletedCount = await deleteSmoke(smokeId);

    if (deletedCount > 0 && state.selectedSmoke) {
      const successMessage = `✅ Grenade successfully deleted!

*Deleted grenade:* ${escapeMarkdown(state.selectedSmoke.name)}
*Map:* ${escapeMarkdown(state.selectedMapLabel ?? state.selectedMap?.display_name ?? 'All maps')}

Use /deletesmoke to delete other grenades.`;

      bot.sendMessage(chatId, successMessage, { parse_mode: 'Markdown' });
    } else {
      bot.sendMessage(chatId, '❌ Error deleting grenade.');
    }
  } catch (error) {
    const fallbackMessage = error instanceof Error ? error.message : 'Unknown error';
    bot.sendMessage(chatId, `❌ Error deleting grenade: ${fallbackMessage}`);
  } finally {
    deleteStates.delete(chatId);
  }
};

export const handleDeleteSmokeCancel = async (callbackQuery: BotCallbackQuery) => {
  const chatId = resolveChatId(callbackQuery);

  if (chatId === undefined) {
    return;
  }

  deleteStates.delete(chatId);
  const messageId = callbackQuery.message?.message_id;
  if (messageId) {
    bot.deleteMessage(chatId, messageId);
  }
  bot.sendMessage(chatId, '❌ Deletion cancelled.');
};

// Обработчик команды /suggestgrenade


// Обработчик команды /viewsuggestions
export const handleViewSuggestions = async (msg: BotMessage) => {
  const chatId = msg.chat.id;
  const adminIds = getAdminIds();

  if (!adminIds.includes(chatId)) {
    bot.sendMessage(chatId, '❌ You don\'t have permission to view suggestions', { parse_mode: 'Markdown' });
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
export const handleSuggestionSelection = async (msg: BotMessage) => {
  const chatId = msg.chat.id;
  const text = msg.text ?? '';
  const adminIds = getAdminIds();

  if (!adminIds.includes(chatId)) {
    return;
  }

  const suggestionIndex = Number.parseInt(text, 10) - 1;

  if (Number.isNaN(suggestionIndex)) {
    bot.sendMessage(chatId, '❌ Please send the number of the suggestion you want to review.');
    return;
  }

  try {
    const suggestedSmokes = await getAllSuggestedSmokes();

    if (suggestionIndex < 0 || suggestionIndex >= suggestedSmokes.length) {
      bot.sendMessage(chatId, '❌ Invalid suggestion number. Try again.');
      return;
    }

    const selectedSuggestion = suggestedSmokes[suggestionIndex];
    const mediaFiles = await getSuggestedSmokeMedia(selectedSuggestion.id);

    const lineEmoji = selectedSuggestion.line ? getLineEmoji(selectedSuggestion.line) : '➖';
    const lineName = selectedSuggestion.line ? getLineName(selectedSuggestion.line) : 'Not specified';
    const mediaCount = mediaFiles.length;

    const message = `📋 *Suggestion Details*

*Grenade:* ${escapeMarkdown(selectedSuggestion.name)}
*Map:* ${escapeMarkdown(selectedSuggestion.map_display_name)}
*Difficulty:* ${getDifficultyEmoji(selectedSuggestion.difficulty)} ${selectedSuggestion.difficulty}
*Side:* ${getSideEmoji(selectedSuggestion.side)} ${selectedSuggestion.side}
*Line:* ${lineEmoji} ${lineName}
*Grenade Type:* ${getGrenadeTypeEmoji(selectedSuggestion.grenade_type)} ${selectedSuggestion.grenade_type}

*Instructions:*
${escapeMarkdown(selectedSuggestion.lineup_instructions)}

*Submitted by:* ${escapeMarkdown(selectedSuggestion.username || 'Unknown')}
*Date:* ${new Date(selectedSuggestion.suggested_at).toLocaleString()}
*Media files:* ${mediaCount}

✅ Approve: use the buttons below
❌ Reject: use the buttons below`;

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
export const handleApproveSuggestion = async (callbackQuery: BotCallbackQuery, suggestionId: number) => {
  const chatId = resolveChatId(callbackQuery);

  if (chatId === undefined) {
    return;
  }

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
      const lineEmoji = suggestion.line ? getLineEmoji(suggestion.line) : '➖';
      const lineName = suggestion.line ? getLineName(suggestion.line) : 'Not specified';

      const successMessage = `✅ *Suggestion approved successfully!*

*Grenade:* ${escapeMarkdown(suggestion.name)}
*Map:* ${escapeMarkdown(suggestion.map_display_name)}
*Difficulty:* ${getDifficultyEmoji(suggestion.difficulty)} ${suggestion.difficulty}
*Side:* ${getSideEmoji(suggestion.side)} ${suggestion.side}
*Line:* ${lineEmoji} ${lineName}
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
    const fallbackMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error approving suggestion:', error);
    bot.sendMessage(chatId, `❌ Error approving suggestion: ${fallbackMessage}`, { parse_mode: 'Markdown' });
  }
};

// Обработчик отклонения предложения
export const handleRejectSuggestion = async (callbackQuery: BotCallbackQuery, suggestionId: number) => {
  const chatId = resolveChatId(callbackQuery);

  if (chatId === undefined) {
    return;
  }

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
      const lineEmoji = suggestion.line ? getLineEmoji(suggestion.line) : '➖';
      const lineName = suggestion.line ? getLineName(suggestion.line) : 'Not specified';

      const successMessage = `❌ *Suggestion rejected successfully!*

*Grenade:* ${escapeMarkdown(suggestion.name)}
*Map:* ${escapeMarkdown(suggestion.map_display_name)}
*Difficulty:* ${getDifficultyEmoji(suggestion.difficulty)} ${suggestion.difficulty}
*Side:* ${getSideEmoji(suggestion.side)} ${suggestion.side}
*Line:* ${lineEmoji} ${lineName}
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
    const fallbackMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error rejecting suggestion:', error);
    bot.sendMessage(chatId, `❌ Error rejecting suggestion: ${fallbackMessage}`, { parse_mode: 'Markdown' });
  }
};


export default {
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