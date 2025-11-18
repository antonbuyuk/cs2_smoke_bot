import { createError, readMultipartFormData } from 'h3';
import { randomUUID } from 'crypto';
import { saveFile } from '../../utils/storage';

export default defineEventHandler(async (event) => {
  const formData = await readMultipartFormData(event);

  if (!formData || formData.length === 0) {
    throw createError({
      statusCode: 400,
      statusMessage: 'No files provided',
    });
  }

  if (formData.length > 10) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Maximum 10 files allowed',
    });
  }

  const uploadedFiles: Array<{ fileId: string; mediaType: 'photo' | 'video'; url: string }> = [];

  for (const file of formData) {
    if (!file.data || !file.filename) {
      continue;
    }

    // Определяем тип медиа по расширению файла
    const filename = file.filename.toLowerCase();
    const isVideo =
      filename.endsWith('.mp4') ||
      filename.endsWith('.mov') ||
      filename.endsWith('.avi') ||
      filename.endsWith('.webm');
    const mediaType = isVideo ? 'video' : 'photo';

    // Генерируем уникальное имя файла
    const ext = file.filename.split('.').pop() || (mediaType === 'video' ? 'mp4' : 'jpg');
    const uniqueFilename = `${randomUUID()}.${ext}`;

    try {
      // Сохраняем файл в storage
      await saveFile(uniqueFilename, file.data);

      // Используем путь uploads/ для совместимости с существующими данными
      // В БД хранится как /uploads/filename.jpg, но файл физически в storage/uploads/
      const fileId = `/uploads/${uniqueFilename}`;
      const url = `/api/media/${encodeURIComponent(fileId)}`;

      uploadedFiles.push({
        fileId,
        mediaType,
        url,
      });
    } catch (error) {
      console.error(`Error saving ${file.filename}:`, error);
      throw createError({
        statusCode: 500,
        statusMessage: `Failed to save ${file.filename}: ${error instanceof Error ? error.message : 'Unknown error'}`,
      });
    }
  }

  return {
    success: true,
    files: uploadedFiles,
  };
});

