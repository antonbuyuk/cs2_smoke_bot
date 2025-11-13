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
  const fileIdParam = event.context.params?.fileId;
  let fileId = typeof fileIdParam === 'string' ? decodeURIComponent(fileIdParam) : undefined;

  if (!fileId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'file_id is required',
    });
  }

  // Если fileId начинается с uploads/ или /uploads/, это локальный файл
  if (fileId.startsWith('uploads/') || fileId.startsWith('/uploads/')) {
    const fileName = fileId.replace(/^\/?uploads\//, '');

    // Используем утилиту storage для чтения файла
    const { getFile, fileExists } = await import('../../utils/storage');

    if (!fileExists(fileName)) {
      throw createError({
        statusCode: 404,
        statusMessage: 'File not found',
      });
    }

    // Определяем MIME тип по расширению
    const ext = fileName.split('.').pop()?.toLowerCase();
    const mimeTypes: Record<string, string> = {
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      png: 'image/png',
      gif: 'image/gif',
      mp4: 'video/mp4',
      mov: 'video/quicktime',
      avi: 'video/x-msvideo',
      webm: 'video/webm',
    };
    const contentType = mimeTypes[ext || ''] || 'application/octet-stream';

    const fileBuffer = await getFile(fileName);

    event.node.res.setHeader('Content-Type', contentType);
    event.node.res.setHeader('Content-Length', fileBuffer.length.toString());
    // Добавляем заголовки для кэширования
    event.node.res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');

    return fileBuffer;
  }

  // Иначе это Telegram file_id - используем старую логику
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

