import type { BotMessage, BotCallbackQuery } from './bot';
import {
  MAP_EMOJIS,
  GRENADE_TYPE_EMOJIS,
  DIFFICULTY_EMOJIS,
  SIDE_EMOJIS,
  LINE_EMOJIS,
} from '../config/emojis';

// Типы для ключей (используются для валидации в боте)
export type MapKey = keyof typeof MAP_EMOJIS;
export type GrenadeTypeKey = keyof typeof GRENADE_TYPE_EMOJIS;
export type DifficultyKey = keyof typeof DIFFICULTY_EMOJIS;
export type SideKey = keyof typeof SIDE_EMOJIS;
export type LineKey = keyof typeof LINE_EMOJIS;

export const isMapKey = (value: string): value is MapKey =>
  Object.prototype.hasOwnProperty.call(MAP_EMOJIS, value);

export const isGrenadeTypeKey = (value: string): value is GrenadeTypeKey =>
  Object.prototype.hasOwnProperty.call(GRENADE_TYPE_EMOJIS, value);

export const isDifficultyKey = (value: string): value is DifficultyKey =>
  Object.prototype.hasOwnProperty.call(DIFFICULTY_EMOJIS, value);

export const isSideKey = (value: string): value is SideKey =>
  Object.prototype.hasOwnProperty.call(SIDE_EMOJIS, value);

export const isLineKey = (value: string): value is LineKey =>
  Object.prototype.hasOwnProperty.call(LINE_EMOJIS, value);

type MessageContext = BotMessage | BotCallbackQuery;

const isBotMessage = (context: MessageContext): context is BotMessage =>
  'chat' in context;

export const isCallbackContext = (context: MessageContext): context is BotCallbackQuery =>
  'data' in context;

export const resolveChatId = (context: MessageContext): number | undefined => {
  if (isBotMessage(context)) {
    return context.chat?.id;
  }

  return context.message?.chat?.id;
};


