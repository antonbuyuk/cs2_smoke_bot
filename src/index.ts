import 'dotenv/config';

import { bot } from './utils/bot';
import type { BotMessage, BotCallbackQuery } from './utils/bot';

import { initDatabase } from './database';
import {
  setBot,
  handleStart,
  handleHelp,
  handleMaps,
  handleSmokeSelection,
  handleCallbackQuery,
  handleSuggestMessage,
  handleSuggestPhoto,
  handleSuggestVideo,
  handleSuggestMediaGroup,
  filterStates,
  suggestStates
} from './handlers/user';

import {
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
} from './handlers/admin';

type MediaGroupPayload = BotMessage | BotMessage[];

const toMessageArray = (payload: MediaGroupPayload): BotMessage[] => Array.isArray(payload) ? payload : [payload];

const resolveChatId = (payload: MediaGroupPayload): number | undefined => {
  const [firstMessage] = toMessageArray(payload);
  return firstMessage?.chat?.id;
};

const getAdminIds = (): number[] => {
  const adminIdsStr = process.env.ADMIN_IDS;

  if (!adminIdsStr) {
    return [226529821];
  }

  return adminIdsStr
    .split(',')
    .map(id => parseInt(id.trim(), 10))
    .filter(id => !Number.isNaN(id));
};

const isAdmin = (userId: number | undefined): userId is number => {
  if (typeof userId !== 'number') {
    return false;
  }

  return getAdminIds().includes(userId);
};

setBot(bot);
setAdminBot(bot);

bot.on('photo', async (msg: BotMessage) => {
  if (suggestStates.has(msg.chat.id)) {
    await handleSuggestPhoto(msg);
    return;
  }

  await handlePhoto(msg);
});

bot.on('video', async (msg: BotMessage) => {
  if (suggestStates.has(msg.chat.id)) {
    await handleSuggestVideo(msg);
    return;
  }

  await handleVideo(msg);
});

bot.on('media_group', async (payload: MediaGroupPayload) => {
  const chatId = resolveChatId(payload);

  if (chatId === undefined) {
    return;
  }

  const messages = toMessageArray(payload);

  if (suggestStates.has(chatId)) {
    await handleSuggestMediaGroup(messages);
    return;
  }

  await handleMediaGroup(messages);
});

bot.onText(/\/start/, handleStart);
bot.onText(/\/maps/, handleMaps);
bot.onText(/\/help/, handleHelp);

bot.onText(/\/addsmoke/, (msg: BotMessage) => {
  if (isAdmin(msg.from?.id)) {
    handleAddSmoke(msg);
    return;
  }

  bot.sendMessage(msg.chat.id, '❌ Access denied. Admin privileges required.', { parse_mode: 'Markdown' });
});

bot.onText(/\/deletesmoke/, (msg: BotMessage) => {
  if (isAdmin(msg.from?.id)) {
    handleDeleteSmoke(msg);
    return;
  }

  bot.sendMessage(msg.chat.id, '❌ Access denied. Admin privileges required.', { parse_mode: 'Markdown' });
});

bot.onText(/\/reset/, (msg: BotMessage) => {
  if (isAdmin(msg.from?.id)) {
    handleReset(msg);
    return;
  }

  bot.sendMessage(msg.chat.id, '❌ Access denied. Admin privileges required.', { parse_mode: 'Markdown' });
});

bot.onText(/\/viewsuggestions/, (msg: BotMessage) => {
  if (isAdmin(msg.from?.id)) {
    handleViewSuggestions(msg);
    return;
  }

  bot.sendMessage(msg.chat.id, '❌ Access denied. Admin privileges required.', { parse_mode: 'Markdown' });
});

bot.onText(/^\/([a-zA-Z]+)$/, (msg: BotMessage, match: RegExpExecArray | null) => {
  if (!match) {
    return;
  }

  const command = match[1].toLowerCase();
  const userCommands = ['start', 'help'];
  const adminCommands = ['addsmoke', 'deletesmoke', 'reset'];

  const availableCommands = isAdmin(msg.from?.id) ? [...userCommands, ...adminCommands] : userCommands;

  if (availableCommands.includes(command)) {
    return;
  }
});

bot.on('message', (msg: BotMessage) => {
  if (msg.text?.startsWith('/')) {
    return;
  }

  if (msg.photo || msg.video || msg.document || msg.media_group_id) {
    return;
  }

  const userId = msg.from?.id;

  if (isAdmin(userId)) {
    handleAdminMessage(msg);

    if (msg.text && !Number.isNaN(Number.parseInt(msg.text, 10))) {
      handleSuggestionSelection(msg);
    }

    return;
  }

  if (suggestStates.has(msg.chat.id)) {
    handleSuggestMessage(msg);
    return;
  }

  if (typeof userId === 'number' && filterStates.has(userId)) {
    handleSmokeSelection(msg);
  }
});

bot.on('callback_query', async (callbackQuery: BotCallbackQuery) => {
  const { data, message } = callbackQuery;

  if (!data || !message) {
    return;
  }

  try {
    if (
      data.startsWith('start_') ||
      data.startsWith('map_') ||
      data.startsWith('smoke_') ||
      data.startsWith('grenade_') ||
      data.startsWith('line_') ||
      data.startsWith('difficulty_') ||
      data.startsWith('show_all_') ||
      data.startsWith('side_') ||
      data.startsWith('suggest_')
    ) {
      await handleCallbackQuery(callbackQuery);
    } else if (
      data.startsWith('addsmoke_') ||
      data.startsWith('deletesmoke_') ||
      data.startsWith('approve_suggestion_') ||
      data.startsWith('reject_suggestion_') ||
      data === 'back_to_suggestions'
    ) {
      console.log('Routing to admin callback handler');
      await handleAdminCallbackQuery(callbackQuery);
    } else {
      console.log('No matching callback handler found for:', data);
    }
  } catch (error) {
    console.error('Error handling callback query:', error);
    bot.answerCallbackQuery(callbackQuery.id, { text: '❌ Error occurred' });
  }
});

bot.on('polling_error', (error: Error) => {
  console.error('Polling error:', error);
});

const initBot = async () => {
  try {
    await initDatabase();
    console.log('CS2 Smoke Bot запущен!');
    console.log('===================== <START> =====================');
  } catch (error) {
    console.error('Ошибка при инициализации бота:', error);
    process.exit(1);
  }
};

initBot();