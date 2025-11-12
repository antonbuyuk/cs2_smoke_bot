# CS2 Bot Admin Panel

Админ-панель для управления CS2 Bot с авторизацией через Telegram.

## Setup

Make sure to install dependencies:

```bash
# npm
npm install

# pnpm
pnpm install

# yarn
yarn install

# bun
bun install
```

## Configuration

Создайте файл `.env` на основе `env.example`:

```env
DATABASE_URL=postgres://postgres:postgres@localhost:5432/cs2_bot
BOT_TOKEN=your_bot_token_here
BOT_USERNAME=your_bot_username
```

## Telegram Bot Setup

Для работы Telegram Login Widget необходимо настроить домен в @BotFather:

1. Откройте @BotFather в Telegram
2. Выберите вашего бота
3. Перейдите в "Bot Settings" → "Domain"
4. Укажите домен вашего сайта

**Важно:** Telegram не принимает `localhost` как валидный домен. Для локальной разработки используйте:

### Вариант 1: Ngrok (рекомендуется для разработки)

1. Установите [ngrok](https://ngrok.com/)
2. Зарегистрируйтесь на [ngrok.com](https://dashboard.ngrok.com/signup) (бесплатно)
3. Получите ваш authtoken на странице [Get Started](https://dashboard.ngrok.com/get-started/your-authtoken)
4. Установите authtoken в ngrok:
   ```bash
   ngrok config add-authtoken YOUR_AUTHTOKEN
   ```
5. Запустите ваш dev сервер в одном терминале:
   ```bash
   cd apps/admin
   npm run dev
   ```
6. В другом терминале запустите ngrok:
   ```bash
   ngrok http 3000
   ```
7. Скопируйте HTTPS URL из вывода ngrok (например, `https://abc123.ngrok.io`)
8. Укажите этот домен в @BotFather (только домен, без `https://`, например: `abc123.ngrok.io`)
9. Откройте приложение через ngrok URL в браузере (не через localhost)

### Вариант 2: Реальный домен

Если у вас есть реальный домен с HTTPS, используйте его.

## Development Server

Start the development server on `http://localhost:3000`:

```bash
# npm
npm run dev

# pnpm
pnpm dev

# yarn
yarn dev

# bun
bun run dev
```

**Примечание:** Если используете ngrok, открывайте приложение через ngrok URL, а не через localhost.

## Production

Build the application for production:

```bash
# npm
npm run build

# pnpm
pnpm build

# yarn
yarn build

# bun
bun run build
```

Locally preview production build:

```bash
# npm
npm run preview

# pnpm
pnpm preview

# yarn
yarn preview

# bun
bun run preview
```

Check out the [deployment documentation](https://nuxt.com/docs/getting-started/deployment) for more information.
