import 'dotenv/config';

import { bot } from '@shared/utils/bot';
import type { BotMessage, BotCallbackQuery } from '@shared/utils/bot';

import { initDatabase } from '@shared/database';
import {
  setBot,
  handleStart,
  handleHelp,
  handleMaps,
  handleSmokeSelection,
  handleCallbackQuery,
  filterStates,
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
} from './handlers/admin';

const MEDIA_GROUP_SETTLE_MS = 500;

interface MediaGroupBuffer {
  messages: BotMessage[];
  timeout?: ReturnType<typeof setTimeout>;
}

const mediaGroupBuffers = new Map<string, MediaGroupBuffer>();

const getAdminIds = (): number[] => {
  const adminIdsStr = process.env.ADMIN_IDS;

  if (!adminIdsStr) {
    return [226529821];
  }

  return adminIdsStr
    .split(',')
    .map((id) => Number.parseInt(id.trim(), 10))
    .filter((id) => !Number.isNaN(id));
};

const isAdmin = (userId: number | undefined): userId is number => {
  if (typeof userId !== 'number') {
    return false;
  }

  return getAdminIds().includes(userId);
};

const dispatchMediaGroup = async (messages: BotMessage[]) => {
  if (messages.length === 0) {
    return;
  }

  const chatId = messages[0]?.chat?.id;

  if (chatId === undefined) {
    return;
  }

  try {
    await handleMediaGroup(messages);
  } catch (error) {
    console.error('Error while processing media group:', error);
  }
};

const scheduleMediaGroupFlush = (mediaGroupId: string) => {
  const buffer = mediaGroupBuffers.get(mediaGroupId);

  if (!buffer) {
    return;
  }

  buffer.timeout = setTimeout(() => {
    mediaGroupBuffers.delete(mediaGroupId);
    void dispatchMediaGroup(buffer.messages);
  }, MEDIA_GROUP_SETTLE_MS);
};

const enqueueMediaGroupMessage = (message: BotMessage) => {
  const mediaGroupId = message.media_group_id;

  if (!mediaGroupId) {
    return false;
  }

  const buffer = mediaGroupBuffers.get(mediaGroupId);

  if (buffer) {
    buffer.messages.push(message);

    if (buffer.timeout) {
      clearTimeout(buffer.timeout);
    }

    scheduleMediaGroupFlush(mediaGroupId);
  } else {
    mediaGroupBuffers.set(mediaGroupId, { messages: [message] });
    scheduleMediaGroupFlush(mediaGroupId);
  }

  return true;
};

setBot(bot.api);
setAdminBot(bot.api);

bot.catch((err) => {
  console.error('Bot error:', err.error);
});

bot.on('message:photo', async (ctx) => {
  const msg = ctx.message;

  if (!msg) {
    return;
  }

  if (msg.media_group_id) {
    enqueueMediaGroupMessage(msg);
  }

  await handlePhoto(msg);
});

bot.on('message:video', async (ctx) => {
  const msg = ctx.message;

  if (!msg) {
    return;
  }

  if (msg.media_group_id) {
    enqueueMediaGroupMessage(msg);
  }

  await handleVideo(msg);
});

bot.command('start', async (ctx) => {
  if (!ctx.message) {
    return;
  }

  await handleStart(ctx.message);
});

bot.command('maps', async (ctx) => {
  if (!ctx.message) {
    return;
  }

  await handleMaps(ctx.message);
});

bot.command('help', async (ctx) => {
  if (ctx.message) {
    await handleHelp(ctx.message);
  }
});

bot.command('addsmoke', async (ctx) => {
  const message = ctx.message;

  if (!message) {
    return;
  }

  if (isAdmin(ctx.from?.id)) {
    await handleAddSmoke(message);
    return;
  }

  await ctx.reply('❌ Access denied. Admin privileges required.', { parse_mode: 'Markdown' });
});

bot.command('deletesmoke', async (ctx) => {
  const message = ctx.message;

  if (!message) {
    return;
  }

  if (isAdmin(ctx.from?.id)) {
    await handleDeleteSmoke(message);
    return;
  }

  await ctx.reply('❌ Access denied. Admin privileges required.', { parse_mode: 'Markdown' });
});

bot.command('reset', async (ctx) => {
  const message = ctx.message;

  if (!message) {
    return;
  }

  if (isAdmin(ctx.from?.id)) {
    await handleReset(message);
    return;
  }

  await ctx.reply('❌ Access denied. Admin privileges required.', { parse_mode: 'Markdown' });
});


bot.on('message', async (ctx) => {
  const msg = ctx.message;

  if (!msg) {
    return;
  }

  if (msg.text?.startsWith('/')) {
    return;
  }

  if (msg.photo || msg.video || msg.document || msg.media_group_id) {
    return;
  }

  const userId = msg.from?.id;

  if (isAdmin(userId)) {
    await handleAdminMessage(msg);
    return;
  }

  if (typeof userId === 'number' && filterStates.has(userId)) {
    await handleSmokeSelection(msg);
  }
});

bot.on('callback_query:data', async (ctx) => {
  const callbackQuery = ctx.callbackQuery as BotCallbackQuery;
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
      data.startsWith('side_')
    ) {
      await handleCallbackQuery(callbackQuery);
    } else if (
      data.startsWith('addsmoke_') ||
      data.startsWith('deletesmoke_')
    ) {
      await handleAdminCallbackQuery(callbackQuery);
    }
  } catch (error) {
    console.error('Error handling callback query:', error);
    await ctx.answerCallbackQuery({ text: '❌ Error occurred' });
  }
});

const initBot = async () => {
  try {
    await initDatabase();
    await bot.start({ drop_pending_updates: true });
    console.log('CS2 Smoke Bot запущен!');
    console.log('===================== <START> =====================');
  } catch (error) {
    console.error('Ошибка при инициализации бота:', error);
    process.exit(1);
  }
};

void initBot();