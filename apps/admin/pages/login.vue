<template>
  <div class="min-h-screen bg-slate-950 flex items-center justify-center px-4">
    <div class="w-full max-w-md">
      <div class="bg-slate-900 rounded-lg border border-slate-800 p-8 shadow-xl">
        <div class="text-center mb-8">
          <h1 class="text-2xl font-bold text-slate-50 mb-2">CS2 Bot Admin</h1>
          <p class="text-slate-400 text-sm">Войдите через Telegram для доступа к панели управления</p>
        </div>

        <div v-if="configError" class="mb-6 p-4 bg-red-950/50 border border-red-800 rounded-lg">
          <p class="text-red-300 text-sm">{{ configError }}</p>
        </div>

        <div v-else-if="error" class="mb-6 p-4 bg-red-950/50 border border-red-800 rounded-lg">
          <p class="text-red-300 text-sm">{{ error }}</p>
        </div>

        <div v-if="isLoggingIn" class="mb-6 text-center">
          <p class="text-slate-400 text-sm">Авторизация...</p>
        </div>

        <div v-if="!configError && !error" ref="widgetContainer" class="flex justify-center min-h-[60px]">
          <div v-if="!widgetLoaded" class="text-slate-400 text-sm">Загрузка виджета...</div>
        </div>

        <div class="mt-6 text-center">
          <p class="text-xs text-slate-500">
            Используя эту панель, вы соглашаетесь с условиями использования
          </p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  layout: 'login',
  middleware: 'auth',
});

const config = useRuntimeConfig();
const botUsername = config.public.telegramBotUsername;

const { login } = useAuth();
const error = ref<string | null>(null);
const isLoggingIn = ref(false);
const widgetLoaded = ref(false);
const configError = ref<string | null>(
  !botUsername ? 'Telegram bot username is not configured. Please set BOT_USERNAME in .env file.' : null
);

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
  } catch (err) {
    console.error('Login error:', err);
    const errorMessage = err instanceof Error ? err.message : 'An error occurred';

    // Обработка специфичных ошибок Telegram
    if (errorMessage.includes('domain') || errorMessage.includes('invalid')) {
      error.value = 'Домен бота не настроен. Настройте домен в @BotFather в разделе "Bot Settings" -> "Domain".';
    } else {
      error.value = errorMessage;
    }
  } finally {
    isLoggingIn.value = false;
  }
};

// Проверяем URL параметры на случай если Telegram использует редирект вместо callback
const route = useRoute();
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