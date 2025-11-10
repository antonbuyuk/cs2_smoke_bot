require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');

// import type { Message, CallbackQuery, PhotoSize, Video, Document, MediaGroup, MessageEntity, User, Chat } from './utils/bot';

const { initDatabase } = require('./database');
const { setBot, handleStart, handleHelp, handleMaps, handleSmokeSelection, handleSmokeDetailsCallback, handleLineCallback, handleDifficultyCallback, handleCallbackQuery, getDifficultyEmoji, getSideEmoji, getLineEmoji, getSideName, getLineName, getGrenadeTypeEmoji, getGrenadeTypeName, filterStates, handleSuggestMessage, saveSuggestedGrenade, suggestStates } = require('./handlers');
const { setAdminBot, handleAddSmoke, handleDeleteSmoke, handleReset, handleAdminMessage, handleAdminCallbackQuery, handlePhoto, handleVideo, handleMediaGroup, handleViewSuggestions, handleSuggestionSelection } = require('./handlers');
const { handleSuggestMediaGroup, handleSuggestPhoto, handleSuggestVideo } = require('./handlers/user-handlers');

// Инициализация бота
const bot = new TelegramBot(process.env.BOT_TOKEN, { polling: true });

// Функция для проверки админа (используем ту же логику, что и в handlers)
const getAdminIds = () => {
  const adminIdsStr = process.env.ADMIN_IDS;
  if (!adminIdsStr) {
    console.error('ADMIN_IDS not found in environment variables, using default admin ID');
    return [226529821]; // Fallback к дефолтному админу
  }
  return adminIdsStr.split(',').map(id => parseInt(id.trim())).filter(id => !isNaN(id));
};

const isAdmin = (userId: number) => {
  const adminIds = getAdminIds();
  return adminIds.includes(userId);
};

// Передаем экземпляр бота в handlers
setBot(bot);
setAdminBot(bot);

// Обработчики медиафайлов
bot.on('photo', async (msg: object) => {
  if (suggestStates.has(msg.chat.id)) {
    await handleSuggestPhoto(msg);
  } else {
    await handlePhoto(msg);
  }
});

bot.on('video', async (msg: object) => {
  // Проверяем, является ли это предложением гранаты
  if (suggestStates.has(msg.chat.id)) {
    await handleSuggestVideo(msg as object);
  } else {
    await handleVideo(msg as object);
  }
});

bot.on('media_group', async (msg: object) => {
  if (suggestStates.has(msg.chat.id)) {
    await handleSuggestMediaGroup(msg as any);
  } else {
    await handleMediaGroup(msg as any);
  }
});

// Обработчики команд для всех пользователей
bot.onText(/\/start/, handleStart);
bot.onText(/\/maps/, handleMaps);
bot.onText(/\/help/, handleHelp);

// Админские команды (проверка прав в самих обработчиках)
bot.onText(/\/addsmoke/, (msg: object) => {
  if (isAdmin(msg.from.id)) {
    handleAddSmoke(msg as object);
  } else {
    bot.sendMessage(msg.chat.id, '❌ Access denied. Admin privileges required.', { parse_mode: 'Markdown' });
  }
});

bot.onText(/\/deletesmoke/, (msg: object) => {
  if (isAdmin(msg.from.id)) {
    handleDeleteSmoke(msg as object);
  } else {
    bot.sendMessage(msg.chat.id, '❌ Access denied. Admin privileges required.', { parse_mode: 'Markdown' });
  }
});

bot.onText(/\/reset/, (msg: object) => {
  if (isAdmin(msg.from.id)) {
    handleReset(msg as object);
  } else {
    bot.sendMessage(msg.chat.id, '❌ Access denied. Admin privileges required.', { parse_mode: 'Markdown' });
  }
});

bot.onText(/\/viewsuggestions/, (msg: object) => {
  if (isAdmin(msg.from.id)) {
    handleViewSuggestions(msg as object);
  } else {
    bot.sendMessage(msg.chat.id, '❌ Access denied. Admin privileges required.', { parse_mode: 'Markdown' });
  }
});

// Обработчик умного поиска команд
bot.onText(/^\/([a-zA-Z]+)$/, (msg: object, match: Array<string>) => {
  const command = match[1].toLowerCase();

  // Проверяем, не является ли это полной командой
  const userCommands = ['start', 'help'];
  const adminCommands = ['addsmoke', 'deletesmoke', 'reset'];
  let allCommands = [...userCommands];

  if (isAdmin(msg.from.id)) {
    allCommands = [...allCommands, ...adminCommands];

  }

  if (allCommands.includes(command)) {
    return; // Пропускаем, если это полная команда
  }
});

// Обработчик текстовых сообщений
bot.on('message', (msg: object) => {
  // Проверяем, не является ли это командой
  if (msg.text && msg.text.startsWith('/')) {
    return;
  }

  // Проверяем, не является ли это медиафайлом
  if (msg.photo || msg.video || msg.document || msg.media_group_id) {
    // Медиафайлы обрабатываются отдельными bot.on('photo'), bot.on('video') и bot.on('media_group')
    return;
  }

  // Проверяем, не является ли это админским сообщением
  const userId = msg.from.id;
  const adminIds = getAdminIds();
  if (adminIds.includes(userId)) {
    // Обрабатываем админские сообщения
    handleAdminMessage(msg as object);
    // Также проверяем, не является ли это выбором предложения для просмотра
    if (msg.text && !isNaN(parseInt(msg.text))) {
      handleSuggestionSelection(msg as object);
    }
    return;
  }

  // Проверяем, не является ли это предложением гранаты
  if (suggestStates.has(msg.chat.id)) {
    handleSuggestMessage(msg as object);
    return;
  }

  // Проверяем, не является ли это выбором смоука
  if (filterStates.has(userId)) {
    handleSmokeSelection(msg as object);
    return;
  }

  // Игнорируем остальные сообщения от обычных пользователей
});

// Обработчик callback кнопок
bot.on('callback_query', async (callbackQuery: object) => {
  const data = callbackQuery.data;
  const chatId = callbackQuery.message.chat.id;

  console.log('Chat ID:', chatId); // Добавляем логирование
  console.log('data:', data);

  try {
    // Обработка пользовательских callback'ов
    if (data.startsWith('start_') || data.startsWith('map_') || data.startsWith('smoke_') || data.startsWith('grenade_') || data.startsWith('line_') || data.startsWith('difficulty_') || data.startsWith('show_all_') || data.startsWith('side_') || data.startsWith('suggest_')) {
      await handleCallbackQuery(callbackQuery);
    }
    // Обработка админских callback'ов
    else if (data.startsWith('addsmoke_') || data.startsWith('deletesmoke_') || data.startsWith('approve_suggestion_') || data.startsWith('reject_suggestion_') || data === 'back_to_suggestions') {
      console.log('Routing to admin callback handler'); // Добавляем логирование
      await handleAdminCallbackQuery(callbackQuery);
    }
    else {
      console.log('No matching callback handler found for:', data); // Добавляем логирование
    }
  } catch (error) {
    console.error('Error handling callback query:', error);
    bot.answerCallbackQuery(callbackQuery.id, '❌ Error occurred');
  }
});

// Обработка ошибок
bot.on('polling_error', (error) => {
  console.error('Polling error:', error);
});

// Инициализация базы данных при запуске
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

// Запускаем бота
initBot();