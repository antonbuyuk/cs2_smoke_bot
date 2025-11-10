require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');

const bot = new TelegramBot(process.env.BOT_TOKEN, { polling: true });

bot.on('message', (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  const username = msg.from.username;
  const firstName = msg.from.first_name;
  const lastName = msg.from.last_name;

  const userInfo = `
👤 *Информация о пользователе:*

*ID:* \`${userId}\`
*Username:* ${username || 'не указан'}
*Имя:* ${firstName} ${lastName || ''}
*Chat ID:* \`${chatId}\`

Добавьте ID \`${userId}\` в массив adminIds в файле admin-handlers.js
  `;

  bot.sendMessage(chatId, userInfo, { parse_mode: 'Markdown' });

  console.log(`Пользователь ${firstName} (${username}) имеет ID: ${userId}`);
});

console.log('Бот запущен для получения ID. Отправьте любое сообщение боту.');