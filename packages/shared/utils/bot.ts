import { Bot } from 'grammy';
import type { CallbackQuery, Message } from 'grammy/types';

const token = process.env.BOT_TOKEN;

if (!token) {
  throw new Error('BOT_TOKEN is not defined in environment variables.');
}

export const bot = new Bot(token);

type BotMessage = Message;
type BotCallbackQuery = CallbackQuery;
type TelegramBot = typeof bot.api;

export type { BotMessage, BotCallbackQuery, TelegramBot };