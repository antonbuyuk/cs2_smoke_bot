<template>
  <div class="login-card">
    <!-- Brand -->
    <div class="brand">
      <span class="brand-mark">N</span>
      <span class="brand-text">CS2 Bot <span>Admin</span></span>
    </div>

    <!-- Header -->
    <div class="header-block">
      <h1>Авторизация</h1>
      <p>Войдите через Telegram для доступа к панели управления</p>
    </div>

    <!-- Telegram button / loading -->
    <div class="tg-section">
      <template v-if="!isLoggingIn && !configError">
        <div v-if="!widgetLoaded" class="loading-text">
          Загрузка виджета
          <span class="dot-pulse"><span /><span /><span /></span>
        </div>
        <div ref="widgetContainer" class="widget-container" />
      </template>
      <div v-else-if="isLoggingIn" class="loading-text">
        Авторизация
        <span class="dot-pulse"><span /><span /><span /></span>
      </div>
    </div>

    <!-- Errors -->
    <div v-if="configError" class="error-block">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/></svg>
      {{ configError }}
    </div>
    <div v-else-if="error" class="error-block">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/></svg>
      {{ error }}
    </div>

    <div class="divider" />

    <p class="footnote">
      Используя эту панель, вы соглашаетесь с условиями использования
    </p>
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  layout: 'login',
});

const config = useRuntimeConfig();

// В режиме разработки сразу редиректим на главную
if (config.public.developMode) {
  await navigateTo('/');
}

const botUsername = config.public.telegramBotUsername;

const { login } = useAuth();
const error = ref<string | null>(null);
const isLoggingIn = ref(false);
const widgetLoaded = ref(false);
const configError = ref<string | null>(
  !botUsername ? 'Telegram bot username is not configured. Please set BOT_USERNAME in .env file.' : null
);

// Проверяем параметр ошибки в URL
const route = useRoute();
if (route.query.error === 'access_denied') {
  error.value = 'Доступ запрещен. Требуются права администратора.';
}

const handleTelegramAuth = async (user: Record<string, string>) => {
  console.log('Telegram auth callback called with:', user);
  console.log('User data keys:', Object.keys(user));
  console.log('User data:', JSON.stringify(user, null, 2));

  error.value = null;
  isLoggingIn.value = true;

  try {
    // Проверяем, что данные от Telegram присутствуют
    if (!user || !user.id || !user.hash) {
      throw new Error('Неполные данные от Telegram. Попробуйте еще раз.');
    }

    const result = await login(user);

    if (result.success) {
      console.log('Login successful, redirecting...');
      await navigateTo('/');
    } else {
      error.value = result.error || 'Failed to login';
    }
  } catch (err: any) {
    console.error('Login error:', err);
    const errorMessage = err instanceof Error ? err.message : 'An error occurred';

    // Обработка специфичных ошибок
    if (errorMessage.includes('domain') || errorMessage.includes('invalid')) {
      error.value = 'Домен бота не настроен. Настройте домен в @BotFather в разделе "Bot Settings" -> "Domain".';
    } else if (errorMessage.includes('Access denied') || errorMessage.includes('Admin privileges') || err?.status === 403 || err?.statusCode === 403) {
      error.value = 'Доступ запрещен. Требуются права администратора. Обратитесь к администратору для получения доступа.';
    } else {
      error.value = errorMessage;
    }
  } finally {
    isLoggingIn.value = false;
  }
};

// Проверяем URL параметры на случай если Telegram использует редирект вместо callback
onMounted(() => {
  // Проверяем URL параметры после монтирования
  if (route.query.id && route.query.hash && route.query.auth_date) {
    console.log('Found Telegram auth data in URL params:', route.query);
    handleTelegramAuth(route.query as Record<string, string>);
  }
});

const widgetContainer = ref<HTMLElement | null>(null);

onMounted(() => {
  // Устанавливаем callback глобально для Telegram Widget
  // Telegram Widget ищет функцию в глобальной области видимости
  const authCallback = (user: Record<string, string>) => {
    console.log('=== Telegram Auth Callback Called ===');
    console.log('User data:', user);
    console.log('User keys:', Object.keys(user || {}));
    handleTelegramAuth(user);
  };

  // Устанавливаем в window для глобального доступа
  // Используем несколько способов для максимальной совместимости
  (window as any).onTelegramAuth = authCallback;
  (globalThis as any).onTelegramAuth = authCallback;

  // Проверяем, что функция доступна глобально
  console.log('onTelegramAuth function set:', typeof (window as any).onTelegramAuth);
  console.log('globalThis.onTelegramAuth:', typeof (globalThis as any).onTelegramAuth);

  // Тестируем вызов функции
  if (typeof (window as any).onTelegramAuth === 'function') {
    console.log('✓ Callback function is available and callable');
  } else {
    console.error('✗ Callback function is NOT available!');
  }

  // Также слушаем сообщения от iframe (на случай если виджет использует postMessage)
  window.addEventListener('message', (event: MessageEvent) => {
    console.log('Message received from:', event.origin, event.data);

    // Проверяем, что сообщение от Telegram
    if (event.origin === 'https://oauth.telegram.org' || event.origin === 'https://telegram.org') {
      console.log('Telegram message received:', event.data);

      // Обрабатываем разные типы событий от Telegram Widget
      if (event.data && typeof event.data === 'object') {
        // Если это событие "unauthorized", игнорируем (это нормально до авторизации)
        if (event.data.event === 'unauthorized') {
          console.log('User not authorized yet (this is normal before login)');
          return;
        }

        // Если данные содержат информацию о пользователе (успешная авторизация)
        if (event.data.id && event.data.hash) {
          console.log('✓ Processing Telegram auth data from message');
          console.log('Auth data:', event.data);
          handleTelegramAuth(event.data as Record<string, string>);
        } else if (event.data.event === 'authorized' && event.data.user) {
          // Альтернативный формат события authorized
          console.log('✓ Processing authorized event with user data');
          console.log('User data:', event.data.user);
          handleTelegramAuth(event.data.user as Record<string, string>);
        }
      }
    }
  });

  // Перехватываем ошибки от Telegram Widget
  const originalConsoleError = console.error;
  console.error = (...args: any[]) => {
    const message = args.join(' ');
    if (message.includes('domain') || message.includes('invalid') || message.includes('Bot domain')) {
      const currentHost = window.location.hostname;
      error.value = `Домен бота не настроен в @BotFather. Укажите домен "${currentHost}" в @BotFather → Bot Settings → Domain (без https:// и без пути).`;
    }
    originalConsoleError.apply(console, args);
  };

  // Также проверяем ошибки через MutationObserver для перехвата сообщений от Telegram Widget
  if (widgetContainer.value) {
    const observer = new MutationObserver(() => {
      const widget = widgetContainer.value?.querySelector('iframe');
      if (widget) {
        try {
          widget.contentWindow?.addEventListener('message', (event: MessageEvent) => {
            if (event.data?.includes('domain') || event.data?.includes('invalid')) {
              const currentHost = window.location.hostname;
              error.value = `Домен бота не настроен в @BotFather. Укажите домен "${currentHost}" в @BotFather → Bot Settings → Domain (без https:// и без пути).`;
            }
          });
        } catch {
          // Игнорируем ошибки доступа к iframe
        }
      }
    });
    observer.observe(widgetContainer.value, { childList: true, subtree: true });
  }

  // Динамически создаем и добавляем Telegram Widget скрипт
  if (widgetContainer.value && botUsername && !configError.value) {
    // Убеждаемся, что callback доступен перед созданием скрипта
    if (typeof (window as any).onTelegramAuth !== 'function') {
      console.error('onTelegramAuth function is not available!');
      error.value = 'Ошибка инициализации виджета. Обновите страницу.';
      return;
    }

    const script = document.createElement('script');
    script.async = true;
    script.src = 'https://telegram.org/js/telegram-widget.js?22';
    script.setAttribute('data-telegram-login', botUsername);
    script.setAttribute('data-size', 'large');
    script.setAttribute('data-radius', '8');
    script.setAttribute('data-request-access', 'write');
    script.setAttribute('data-userpic', 'true');

    // Используем data-auth-url для редиректа (более надежный способ)
    // Telegram будет редиректить на этот URL с параметрами авторизации
    const authUrl = `${window.location.origin}/api/auth/login`;
    script.setAttribute('data-auth-url', authUrl);
    console.log('Using auth-url:', authUrl);

    // Также устанавливаем callback на случай если виджет поддерживает оба способа
    const callbackName = 'onTelegramAuth';
    script.setAttribute('data-onauth', `${callbackName}(user)`);

    // Убеждаемся, что функция доступна под этим именем
    if (typeof (window as any)[callbackName] !== 'function') {
      console.error(`Function ${callbackName} is not available!`);
    } else {
      console.log(`✓ Function ${callbackName} is available`);
    }

    console.log('Creating Telegram Widget with bot:', botUsername);
    console.log('Callback function available:', typeof (window as any).onTelegramAuth);

    script.onload = () => {
      widgetLoaded.value = true;
      // Даем время виджету загрузиться и проверить домен
      setTimeout(() => {
        const iframe = widgetContainer.value?.querySelector('iframe');
        if (!iframe && !error.value) {
          // Если iframe не появился через 3 секунды, возможно проблема с доменом
          const currentHost = window.location.hostname;
          error.value = `Виджет не загрузился. Убедитесь, что домен "${currentHost}" правильно настроен в @BotFather → Bot Settings → Domain (без https:// и без пути). Может потребоваться несколько минут для обновления настроек.`;
        }
      }, 3000);
    };

    script.onerror = () => {
      error.value = 'Не удалось загрузить Telegram Widget. Проверьте настройки бота в @BotFather.';
    };

    widgetContainer.value.appendChild(script);
  }
});
</script>

<style lang="scss">
@use '~/assets/styles/mixins' as *;

html, body {
  height: 100%;
  background:
    radial-gradient(ellipse 70% 50% at 50% 20%, var(--accent-soft), transparent 60%),
    linear-gradient(var(--grid) 1px, transparent 1px) 0 0 / 32px 32px,
    linear-gradient(90deg, var(--grid) 1px, transparent 1px) 0 0 / 32px 32px,
    var(--bg-0);
}

body {
  display: grid;
  place-items: center;
  padding: 24px;
  min-height: 100vh;
}

.login-card {
  width: min(420px, 100%);
  background: var(--bg-1);
  border: 1px solid var(--line-strong);
  border-radius: 20px;
  padding: 48px 36px 36px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 28px;
  box-shadow: 0 24px 64px rgba(0,0,0,.5);
  position: relative;
  overflow: hidden;

  @include respond-to(480) { padding: 36px 24px 28px; border-radius: 16px; }

  &::before {
    content: "";
    position: absolute;
    top: 0; left: 0; right: 0;
    height: 2px;
    background: linear-gradient(90deg, transparent, var(--accent), transparent);
  }

  .brand {
    display: flex;
    align-items: center;
    gap: 12px;

    &-mark {
      width: 40px;
      height: 40px;
      border-radius: 10px;
      background: linear-gradient(135deg, var(--accent), oklch(0.66 0.18 200));
      display: grid;
      place-items: center;
      font-family: 'JetBrains Mono', monospace;
      font-weight: 700;
      font-size: 17px;
      color: var(--accent-ink);
      box-shadow: 0 0 24px var(--accent-glow);
    }

    &-text {
      font-size: 20px;
      font-weight: 700;
      letter-spacing: 0.01em;
      color: var(--text-1);

      span { color: var(--accent); }
    }
  }

  .header-block {
    text-align: center;
    display: flex;
    flex-direction: column;
    gap: 8px;

    h1 {
      font-size: 24px;
      font-weight: 700;
      letter-spacing: -0.01em;
      margin: 0;

      @include respond-to(480) { font-size: 20px; }
    }

    p {
      color: var(--text-2);
      font-size: 14px;
      line-height: 1.5;
      max-width: 32ch;
      margin: 0 auto;
    }
  }

  .tg-section {
    width: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 14px;
  }

  .widget-container {
    display: flex;
    justify-content: center;
    width: 100%;
    min-height: 60px;
  }

  .loading-text {
    font-family: 'JetBrains Mono', monospace;
    font-size: 12px;
    color: var(--text-3);
    letter-spacing: 0.06em;
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .dot-pulse {
    display: inline-flex;
    gap: 4px;

    span {
      width: 4px;
      height: 4px;
      border-radius: 50%;
      background: var(--text-3);
      animation: pulse-dot 1.2s ease-in-out infinite;
      display: block;

      &:nth-child(2) { animation-delay: 0.15s; }
      &:nth-child(3) { animation-delay: 0.3s; }
    }
  }

  .error-block {
    width: 100%;
    padding: 14px 16px;
    background: var(--red-soft);
    border: 1px solid var(--red);
    border-radius: var(--radius-sm);
    display: flex;
    align-items: center;
    gap: 10px;
    font-size: 13px;
    color: var(--text-1);
    line-height: 1.45;

    svg { flex-shrink: 0; width: 18px; height: 18px; color: var(--red); }
  }

  .divider { width: 100%; height: 1px; background: var(--line); }

  .footnote { font-size: 12px; color: var(--text-4); text-align: center; line-height: 1.5; margin: 0; }
}

@keyframes pulse-dot {
  0%, 80%, 100% { opacity: 0.3; transform: scale(0.8); }
  40%            { opacity: 1;   transform: scale(1); }
}
</style>
