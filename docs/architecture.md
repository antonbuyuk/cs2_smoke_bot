# Architecture

Снимок системы. Когда добавляешь крупную фичу или меняешь инфру — обновляй.

## Overview

cs2-bot-admin — личный flashcard-deck для line-up'ов гранат CS2. SSR-приложение на Nuxt 4, развёрнутое на одном VPS, аутентификация через Telegram Login Widget. Аудитория: 1 владелец + 5 знакомых, не публичный сервис.

NOT a goal: масштаб, market fit, community-фичи (рейтинги, комменты), монетизация.

```mermaid
flowchart LR
    U[User Browser] -->|HTTPS| N[nginx :443]
    N -->|proxy_pass :3000| A[Nuxt admin container]
    A -->|172.17.0.1:5432| P[(Postgres on host)]
    A -->|Telegram API fallback| T[Telegram]
    A -->|read/write| S[/storage/uploads bind mount/]
```

## Stack

- **Runtime:** Node.js 20 (alpine)
- **Frontend/SSR:** Nuxt 4, Vue 3, Tailwind, `@nuxtjs/i18n` (ru default, en)
- **PWA:** `@vite-pwa/nuxt` (manifest + Service Worker, см. backlog)
- **Database:** PostgreSQL 16 на хосте VPS (см. `decisions.md`)
- **Auth:** Telegram Login Widget + HMAC initData verification
- **Bot (frozen):** Grammy + TypeScript — в репо есть, не деплоим
- **Shared:** `@cs2/shared` — типы, БД-запросы, утилиты

## Repo layout

```
apps/
├── admin/          ← Nuxt — деплоим
└── bot/            ← Grammy — заморожен, не деплоим
packages/
└── shared/         ← @cs2/shared — алиас @shared/*
docs/               ← эта папка
```

Алиас `@shared/* → ../../packages/shared/*` настроен в обоих `apps/*/tsconfig.json`. Импорты `import { getMaps } from '@shared/database'` работают и в исходниках, и после сборки.

## Auth model

```
1. Юзер открывает /admin/login
2. Telegram Login Widget → POST /api/auth/telegram с initData
3. Server валидирует HMAC по BOT_TOKEN
4. Server проверяет user.id ∈ ADMIN_IDS (env, через запятую) — для admin-роли
5. Server создаёт row в users (если нет) с ролью admin/user
6. Server выставляет httpOnly cookie с user_id (signed JWT_SECRET)
```

Middleware `middleware/auth.ts` — **opt-in**, защищает только `/admin/*` маршруты. Публичные GET API (просмотр гранат) доступны без cookie. Не делаем глобальный block — иначе случайные read-only страницы перестанут работать без логина.

Роли: `admin` / `user` / `guest`. Source of truth — таблица `users` (см. memory `project_roles.md`).

## Data model

| Таблица | Назначение |
|---|---|
| `maps`, `sides`, `lines`, `difficulties`, `grenade_types` | справочники |
| `smokes` | линапы (FK на все справочники) |
| `granade_media` | Telegram file_id + локальный путь + порядок |
| `users` | Telegram user_id + role |
| `user_grenade_progress` | (user_id, grenade_id, status) — для flashcard-фичи (планируется) |

Bootstrap-схема — `packages/shared/database/database.ts:initDatabase()`. Запускается при старте приложения. **Это не migrations** — это idempotent CREATE TABLE IF NOT EXISTS. Реальные миграции (ALTER) — пока не нужны, при первой ALTER переедем на `node-pg-migrate` (см. tech debt).

## Media pipeline

Двухрежимный resolver в `server/utils/storage.ts`:

1. **Локальный путь** (приоритет): `${STORAGE_PATH}/<file_id>.<ext>` — bind mount в контейнере на `/app/storage/uploads`.
2. **Telegram fallback**: если локального файла нет, тянем через Telegram Bot API по `file_id`. Нужен `BOT_TOKEN` (даже когда бот заморожен).

Bot-процесс не нужен — admin сам делает HTTP-запросы к Telegram API.

`STORAGE_PATH` — env, дефолт `./storage/uploads` (для локалки), в проде — `/app/storage/uploads`.

## PWA (планируется)

Через `@vite-pwa/nuxt`:
- **App shell** (HTML/JS/CSS) — `NetworkFirst` (актуальная сборка приоритетнее)
- **API** (`/api/*`) — `StaleWhileRevalidate` (мгновенный отклик + фоновое обновление)
- **Медиа** (`/api/media/*`) — `CacheFirst` (file_id immutable, файл по нему не меняется)

Что работает offline: просмотр уже посмотренных гранат с их медиа. Что не работает: логин, добавление, синхронизация прогресса (планируется через background sync).

## Infrastructure

- **VPS:** один Hetzner-style инстанс (144.91.73.230), Ubuntu 24.04
- **nginx:** на хосте, vhost `cs2.awawa-chef.com` → `proxy_pass http://127.0.0.1:3000`
- **TLS:** Let's Encrypt через `certbot --nginx`
- **Postgres:** хостовый (см. decisions.md), коннект из контейнера через `host.docker.internal` (= `172.17.0.1`)
- **Storage:** bind mount `/opt/cs2-bot/storage/uploads` → `/app/storage/uploads`
- **Domain:** `cs2.awawa-chef.com` (Namecheap)

Соседний проект `food-bot` живёт на той же VPS, использует тот же nginx и Postgres. Не трогаем.

## Deploy pipeline

```
push main → GH Actions →
    docker build → push ghcr.io/abuyuk10/cs2-bot-admin:${{ github.sha }} →
    SSH root@144.91.73.230 →
    cd /opt/cs2-bot && docker compose pull && docker compose up -d
```

Подробности — `deployment.md`. Rollback — пин предыдущего sha в `docker-compose.yml`, `up -d`.

## Known tech debt

- `initDatabase()` — bootstrap, не миграции. Переезжаем на `node-pg-migrate` при первой реальной `ALTER`.
- Тестов нет (`apps/bot/jest.config.js` есть, тестов нет).
- Бот-state-machines (`chatStates`, `filterStates`) — in-memory `Map`. Релевантно если разморозим бота на нескольких инстансах (сейчас инстанс один).
- HA нет: один VPS, один контейнер. Для 6 юзеров и не нужно.
- `STORAGE_PATH` ещё хардкоднут в коде в нескольких местах (см. task #5).
