import { createError, defineEventHandler, sendProxy } from 'h3';
import { useRuntimeConfig } from '#imports';

interface TelegramFileResponse {
  ok: boolean;
  description?: string;
  result?: {
    file_id: string;
    file_unique_id: string;
    file_path?: string;
    file_size?: number;
  };
}

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig(event);
  const token = config.telegramBotToken || process.env.BOT_TOKEN;

  if (!token) {
    throw createError({
      statusCode: 500,
      statusMessage: 'BOT_TOKEN is not configured on the server',
    });
  }

  const TELEGRAM_API_BASE = `https://api.telegram.org/bot${token}`;
  const TELEGRAM_FILE_BASE = `https://api.telegram.org/file/bot${token}`;

  const fileIdParam = event.context.params?.fileId;
  const fileId = typeof fileIdParam === 'string' ? fileIdParam : undefined;

  if (!fileId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'file_id is required',
    });
  }

  const response = await fetch(`${TELEGRAM_API_BASE}/getFile`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      file_id: fileId,
    }),
  });

  if (!response.ok) {
    throw createError({
      statusCode: response.status,
      statusMessage: `Telegram API error: ${response.statusText}`,
    });
  }

  const payload = (await response.json()) as TelegramFileResponse;

  if (!payload.ok || !payload.result?.file_path) {
    throw createError({
      statusCode: 502,
      statusMessage: payload.description ?? 'Unable to resolve Telegram file',
    });
  }

  const fileUrl = `${TELEGRAM_FILE_BASE}/${payload.result.file_path}`;

  return sendProxy(event, fileUrl);
});

