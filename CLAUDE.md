# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

CS2 Smoke Bot — Telegram-бот для управления линапами гранат в CS2. Монорепозиторий с тремя пакетами:

- **`apps/bot`** — Telegram-бот на Grammy + TypeScript
- **`apps/admin`** — Веб-панель администратора на Nuxt 4 / Vue 3
- **`packages/shared`** — Общие типы, БД-запросы, конфиги (`@cs2/shared`)

## Commands

### Root (монорепозиторий)
```bash
npm install          # установить зависимости всех пакетов

npm run dev:bot      # запустить бот в режиме разработки (tsx watch)
npm run dev:admin    # запустить Nuxt dev-сервер (http://localhost:3000)
npm run dev:all      # бот + admin + ngrok туннель

npm run build        # собрать оба приложения
npm run build:bot    # собрать только бот
npm run build:admin  # собрать только admin

npm start            # запустить собранный бот (dist/index.js)
```

### Bot (`apps/bot`)
```bash
npm run typecheck    # проверка типов без компиляции
npm run lint         # ESLint для src/**/*.{ts,js}
npm run test         # Jest (тестов пока нет, конфиг есть)
```

### Admin (`apps/admin`)
```bash
npm run dev          # Nuxt dev-сервер
npm run build        # production SSR-сборка
npm run preview      # превью production-сборки
```

## Architecture

### Data flow

```
Telegram User → Grammy (apps/bot) → @cs2/shared/database → PostgreSQL
Admin Browser → Nuxt API routes (apps/admin) → @cs2/shared/database → PostgreSQL
```

### Shared package (`packages/shared`)

Центральный пакет — вся логика работы с БД сосредоточена здесь:

- `database/database.ts` — пул PostgreSQL, все SQL-запросы, автомиграции. `initDatabase()` создаёт схему при первом запуске.
- `config/constants.ts` — функции `getMapEmoji()`, `createKeyboardFromDB()`, `escapeMarkdown()`.
- `utils/types/index.ts` — все TypeScript-интерфейсы (`SmokeRecord`, `FilterState`, `AddSmokeState` и т.д.).
- `utils/bot.ts` — единственный экземпляр Grammy-бота, реэкспортируемый обоими apps.

### Bot state machines

Бот хранит состояния в памяти в `Map<chatId, State>`:

- `filterStates` — пользовательский фильтр (карта → сторона → линия → тип гранаты → сложность)
- `chatStates` — мульти-шаговый визард добавления гранаты (admin)
- `deleteStates` — процесс удаления гранаты (admin)

Состояния удаляются после завершения шага или при `/reset`.

### Media groups

Telegram отправляет файлы из одной группы отдельными сообщениями. В `apps/bot/src/index.ts` буфер с дебаунсом 500 мс собирает их в один массив перед передачей в обработчик. Admin-обработчик использует 5000 мс дебаунс.

### Admin dashboard

Nuxt 4 + Vue 3 + Tailwind + `@nuxtjs/i18n` (ru по умолчанию, en).

- `middleware/auth.ts` — защита маршрутов
- `composables/useReferenceTable.ts` — CRUD для справочных таблиц
- `components/ReferenceTable.vue` — переиспользуемая таблица для maps/sides/lines/difficulties/grenade-types

## Environment Variables

**`apps/bot/.env`**
```
BOT_TOKEN=
DATABASE_URL=postgres://postgres:password@localhost:5432/cs2_bot
BOT_USERNAME=
ADMIN_IDS=226529821,другие_id   # через запятую
```

**`apps/admin/.env`**
```
DATABASE_URL=postgres://postgres:password@localhost:5432/cs2_bot
BOT_TOKEN=
BOT_USERNAME=
DEVELOP_MODE=true   # true = localhost, false = 0.0.0.0 (ngrok)
```

## Database

PostgreSQL, база `cs2_bot`. Схема создаётся автоматически при `initDatabase()`.

Справочные таблицы: `maps`, `sides`, `difficulties`, `lines`, `grenade_types`.  
Данные: `smokes` (линапы), `granade_media` (Telegram file_id, тип, порядок).

Для добавления миграции — редактировать `runMigrations()` в `packages/shared/database/database.ts`. Миграции применяются при каждом запуске.

## Path Aliases

В обоих `apps/*/tsconfig.json` настроен алиас:
```
@shared/* → ../../packages/shared/*
```

Импорты вида `import { getMaps } from '@shared/database'` работают как в исходниках, так и после сборки.
