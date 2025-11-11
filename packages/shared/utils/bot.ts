import TelegramBot from 'node-telegram-bot-api';

const token = process.env.BOT_TOKEN;

if (!token) {
  throw new Error('BOT_TOKEN is not defined in environment variables.');
}

export const bot = new TelegramBot(token, { polling: true });

type BotMessage = TelegramBot.Message;
type BotCallbackQuery = TelegramBot.CallbackQuery;

export type { BotMessage, BotCallbackQuery, TelegramBot };