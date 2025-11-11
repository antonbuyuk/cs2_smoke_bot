import type { BotMessage, BotCallbackQuery } from './bot';
import type {
  MapKey,
  GrenadeTypeKey,
  DifficultyKey,
  SideKey,
  LineKey,
} from '../config/constants';

import {
  MAP_TYPES,
  GRENADE_TYPES,
  DIFFICULTY_LEVELS,
  SIDE_TYPES,
  LINE_TYPES,
} from '../config/constants';

type Dictionary<T extends PropertyKey> = Record<T, unknown>;

const hasDictionaryKey = <T extends Dictionary<PropertyKey>>(
  dictionary: T,
  key: PropertyKey,
): key is keyof T => Object.prototype.hasOwnProperty.call(dictionary, key);

export const isMapKey = (value: string): value is MapKey =>
  hasDictionaryKey(MAP_TYPES, value);

export const isGrenadeTypeKey = (value: string): value is GrenadeTypeKey =>
  hasDictionaryKey(GRENADE_TYPES, value);

export const isDifficultyKey = (value: string): value is DifficultyKey =>
  hasDictionaryKey(DIFFICULTY_LEVELS, value);

export const isSideKey = (value: string): value is SideKey =>
  hasDictionaryKey(SIDE_TYPES, value);

export const isLineKey = (value: string): value is LineKey =>
  hasDictionaryKey(LINE_TYPES, value);

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


