import { join } from 'path';
import { mkdir, writeFile, readFile, unlink } from 'fs/promises';
import { existsSync } from 'fs';

// Получаем путь к директории хранилища из переменной окружения или используем дефолтный
const getStorageDir = (): string => {
  const customPath = process.env.STORAGE_PATH;
  if (customPath) {
    return customPath;
  }
  // По умолчанию храним в storage/uploads в корне проекта
  return join(process.cwd(), 'storage', 'uploads');
};

// Инициализация директории хранилища
export const ensureStorageDir = async (): Promise<string> => {
  const storageDir = getStorageDir();

  if (!existsSync(storageDir)) {
    await mkdir(storageDir, { recursive: true });
  }

  return storageDir;
};

// Сохранение файла
export const saveFile = async (
  filename: string,
  data: Buffer | Uint8Array
): Promise<string> => {
  const storageDir = await ensureStorageDir();
  const filePath = join(storageDir, filename);

  await writeFile(filePath, data);

  return filePath;
};

// Чтение файла
export const getFile = async (filename: string): Promise<Buffer> => {
  const storageDir = getStorageDir();
  const filePath = join(storageDir, filename);

  if (!existsSync(filePath)) {
    throw new Error(`File not found: ${filename}`);
  }

  return await readFile(filePath);
};

// Проверка существования файла
export const fileExists = (filename: string): boolean => {
  const storageDir = getStorageDir();
  const filePath = join(storageDir, filename);

  return existsSync(filePath);
};

// Удаление файла
export const deleteFile = async (filename: string): Promise<void> => {
  const storageDir = getStorageDir();
  const filePath = join(storageDir, filename);

  if (existsSync(filePath)) {
    await unlink(filePath);
  }
};

// Получение полного пути к файлу
export const getFilePath = (filename: string): string => {
  const storageDir = getStorageDir();
  return join(storageDir, filename);
};

