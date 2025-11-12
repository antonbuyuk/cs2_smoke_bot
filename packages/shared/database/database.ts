import sqlite3 from 'sqlite3';
import { promises as fs } from 'node:fs';
import { dirname, resolve as resolvePath } from 'node:path';
import { fileURLToPath } from 'node:url';
import type {
  NewSmokeInput,
  MediaType,
  SmokeMediaRecord,
  SmokeWithMap,
  SuggestedSmoke,
  SuggestedSmokeInput,
  SuggestedSmokeWithMap,
  SuggestedSmokeMediaRecord,
  MapRecord,
  RealMapKey,
} from '../utils/types';

let db: sqlite3.Database;

const migrationsDirectory = fileURLToPath(new URL('./migrations', import.meta.url));

const openDatabase = (dbPath: string): Promise<sqlite3.Database> => new Promise((resolve, reject) => {
  const instance = new sqlite3.Database(dbPath, (err) => {
    if (err) {
      reject(err);
      return;
    }

    resolve(instance);
  });
});

const ensureMigrationsTable = (): Promise<void> => new Promise((resolve, reject) => {
  db.run(
    `CREATE TABLE IF NOT EXISTS migrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      run_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,
    (err) => {
      if (err) {
        reject(err);
        return;
      }

      resolve();
    }
  );
});

const getAppliedMigrations = async (): Promise<Set<string>> => new Promise((resolve, reject) => {
  db.all<{ name: string }>('SELECT name FROM migrations ORDER BY id', (err, rows) => {
    if (err) {
      reject(err);
      return;
    }

    resolve(new Set(rows?.map((row) => row.name) ?? []));
  });
});

const applyMigration = (name: string, sql: string): Promise<void> => new Promise((resolve, reject) => {
  db.serialize(() => {
    db.run('BEGIN TRANSACTION', (beginError) => {
      if (beginError) {
        reject(beginError);
        return;
      }

      db.exec(sql, (execError) => {
        if (execError) {
          db.run('ROLLBACK', () => {
            reject(execError);
          });
          return;
        }

        db.run('INSERT INTO migrations (name) VALUES (?)', [name], (insertError) => {
          if (insertError) {
            db.run('ROLLBACK', () => {
              reject(insertError);
            });
            return;
          }

          db.run('COMMIT', (commitError) => {
            if (commitError) {
              reject(commitError);
              return;
            }

            resolve();
          });
        });
      });
    });
  });
});

const runMigrations = async () => {
  await ensureMigrationsTable();

  let files: string[];
  try {
    files = await fs.readdir(migrationsDirectory);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return;
    }

    throw error;
  }

  const applied = await getAppliedMigrations();
  const sqlFiles = files.filter((file) => file.endsWith('.sql')).sort();

  for (const fileName of sqlFiles) {
    if (applied.has(fileName)) {
      continue;
    }

    const filePath = resolvePath(migrationsDirectory, fileName);
    const sql = await fs.readFile(filePath, 'utf-8');
    await applyMigration(fileName, sql);
  }
};

interface MapIdRow {
  id: number;
}

export const initDatabase = async (): Promise<void> => {
  const defaultPath = resolvePath(process.cwd(), 'data/smokes.db');
  const configuredPath = process.env.DB_PATH ? resolvePath(process.cwd(), process.env.DB_PATH) : defaultPath;

  await fs.mkdir(dirname(configuredPath), { recursive: true });

  db = await openDatabase(configuredPath);
  await runMigrations();
};

export const getMaps = (): Promise<MapRecord[]> => new Promise((resolve, reject) => {
  db.all<MapRecord>('SELECT * FROM maps ORDER BY display_name', (err, rows) => {
    if (err) {
      reject(err);
      return;
    }

    resolve(rows ?? []);
  });
});

export const getSmokesByMap = (mapName: RealMapKey): Promise<SmokeWithMap[]> => new Promise((resolve, reject) => {
  db.all<SmokeWithMap>(`
      SELECT s.*, m.name as map_name, m.display_name as map_display_name
      FROM smokes s
      JOIN maps m ON s.map_id = m.id
      WHERE m.name = ?
      ORDER BY s.name
    `, [mapName], (err, rows) => {
    if (err) {
      reject(err);
      return;
    }

    resolve(rows ?? []);
  });
});

export const getAllSmokes = (): Promise<SmokeWithMap[]> => new Promise((resolve, reject) => {
  db.all<SmokeWithMap>(`
      SELECT s.*, m.name as map_name, m.display_name as map_display_name
      FROM smokes s
      JOIN maps m ON s.map_id = m.id
      ORDER BY m.display_name, s.name
    `, (err, rows) => {
    if (err) {
      reject(err);
      return;
    }

    resolve(rows ?? []);
  });
});

export const addSmoke = (mapName: string, smokeData: NewSmokeInput): Promise<number> => new Promise((resolve, reject) => {
  db.get<MapIdRow>('SELECT id FROM maps WHERE name = ?', [mapName], (err, map) => {
    if (err) {
      reject(err);
      return;
    }

    if (!map) {
      reject(new Error('Карта не найдена'));
      return;
    }

    const imageUrl = smokeData.imageUrl ?? null;
    const line = smokeData.line ?? null;
    const grenadeType = smokeData.grenadeType ?? 'smoke';

    db.run(
      `
        INSERT INTO smokes (map_id, name, lineup_instructions, image_url, difficulty, side, line, grenade_type)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [map.id, smokeData.name, smokeData.lineup_instructions, imageUrl, smokeData.difficulty, smokeData.side, line, grenadeType],
      function insertCallback(err) {
        if (err) {
          reject(err);
          return;
        }

        resolve(this.lastID ?? 0);
      }
    );
  });
});

// Функция для сохранения медиафайлов
export const saveSmokeImage = (
  smokeId: number,
  fileId: string,
  mediaType: MediaType = 'photo',
  caption: string | null = null
): Promise<number> => new Promise((resolve, reject) => {
  db.run(
    'INSERT INTO smoke_media (smoke_id, file_id, media_type, caption) VALUES (?, ?, ?, ?)',
    [smokeId, fileId, mediaType, caption],
    function insertCallback(err) {
      if (err) {
        reject(err);
        return;
      }

      resolve(this.lastID ?? 0);
    }
  );
});

// Функция для получения медиафайлов смока
export const getSmokeMedia = (smokeId: number): Promise<SmokeMediaRecord[]> => new Promise((resolve, reject) => {
  db.all<SmokeMediaRecord>(
    'SELECT * FROM smoke_media WHERE smoke_id = ? ORDER BY created_at',
    [smokeId],
    (err, rows) => {
      if (err) {
        reject(err);
        return;
      }

      resolve(rows ?? []);
    }
  );
});

// Функция для удаления смока
export const deleteSmoke = (smokeId: number): Promise<number> => new Promise((resolve, reject) => {
  db.serialize(() => {
    // Сначала удаляем связанные медиафайлы
    db.run('DELETE FROM smoke_media WHERE smoke_id = ?', [smokeId], (err) => {
      if (err) {
        reject(err);
        return;
      }

      // Затем удаляем сам смок
      db.run('DELETE FROM smokes WHERE id = ?', [smokeId], function deleteCallback(err) {
        if (err) {
          reject(err);
          return;
        }

        resolve(this.changes ?? 0);
      });
    });
  });
});

// Функция для получения смока по ID
export const getSmokeById = (smokeId: number): Promise<SmokeWithMap | undefined> => new Promise((resolve, reject) => {
  db.get<SmokeWithMap>(
    `
      SELECT s.*, m.name as map_name, m.display_name as map_display_name
      FROM smokes s
      JOIN maps m ON s.map_id = m.id
      WHERE s.id = ?
    `,
    [smokeId],
    (err, row) => {
      if (err) {
        reject(err);
        return;
      }

      resolve(row ?? undefined);
    }
  );
});

export const clearAllSmokes = (): Promise<void> => new Promise((resolve, reject) => {
  db.serialize(() => {
    // Сначала удаляем все медиафайлы
    db.run('DELETE FROM smoke_media', (err) => {
      if (err) {
        reject(err);
        return;
      }

      // Затем удаляем все смоки
      db.run('DELETE FROM smokes', (err) => {
        if (err) {
          reject(err);
          return;
        }

        resolve();
      });
    });
  });
});

// Функции для работы с предложенными гранатами
export const addSuggestedSmoke = (
  mapName: string,
  smokeData: SuggestedSmokeInput,
  userId: number,
  username: string
): Promise<number> => new Promise((resolve, reject) => {
  db.get<MapIdRow>('SELECT id FROM maps WHERE name = ?', [mapName], (err, map) => {
    if (err) {
      reject(err);
      return;
    }

    if (!map) {
      reject(new Error('Карта не найдена'));
      return;
    }

    const imageUrl = smokeData.imageUrl ?? null;
    const line = smokeData.line ?? null;
    const grenadeType = smokeData.grenadeType ?? 'smoke';

    db.run(
      `
        INSERT INTO suggested_smokes (map_id, name, lineup_instructions, image_url, difficulty, side, line, grenade_type, user_id, username)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [map.id, smokeData.name, smokeData.lineup_instructions, imageUrl, smokeData.difficulty, smokeData.side, line, grenadeType, userId, username],
      function insertCallback(err) {
        if (err) {
          reject(err);
          return;
        }

        resolve(this.lastID ?? 0);
      }
    );
  });
});

// Функция для сохранения медиафайлов предложенных гранат
export const saveSuggestedSmokeImage = (
  suggestedSmokeId: number,
  fileId: string,
  mediaType: MediaType = 'photo',
  caption: string | null = null
): Promise<number> => new Promise((resolve, reject) => {
  db.run(
    'INSERT INTO suggested_smoke_media (suggested_smoke_id, file_id, media_type, caption) VALUES (?, ?, ?, ?)',
    [suggestedSmokeId, fileId, mediaType, caption],
    function insertCallback(err) {
      if (err) {
        reject(err);
        return;
      }

      resolve(this.lastID ?? 0);
    }
  );
});

// Функция для получения всех предложенных гранат
export const getAllSuggestedSmokes = (): Promise<SuggestedSmokeWithMap[]> => new Promise((resolve, reject) => {
  db.all<SuggestedSmokeWithMap>(
    `
      SELECT s.*, m.name as map_name, m.display_name as map_display_name
      FROM suggested_smokes s
      JOIN maps m ON s.map_id = m.id
      ORDER BY s.suggested_at DESC
    `,
    (err, rows) => {
      if (err) {
        reject(err);
        return;
      }

      resolve(rows ?? []);
    }
  );
});

// Функция для получения предложенной гранаты по ID
export const getSuggestedSmokeById = (suggestedSmokeId: number): Promise<SuggestedSmokeWithMap | undefined> => new Promise((resolve, reject) => {
  db.get<SuggestedSmokeWithMap>(
    `
      SELECT s.*, m.name as map_name, m.display_name as map_display_name
      FROM suggested_smokes s
      JOIN maps m ON s.map_id = m.id
      WHERE s.id = ?
    `,
    [suggestedSmokeId],
    (err, row) => {
      if (err) {
        reject(err);
        return;
      }

      resolve(row ?? undefined);
    }
  );
});

// Функция для получения медиафайлов предложенной гранаты
export const getSuggestedSmokeMedia = (suggestedSmokeId: number): Promise<SuggestedSmokeMediaRecord[]> => new Promise((resolve, reject) => {
  db.all<SuggestedSmokeMediaRecord>(
    'SELECT * FROM suggested_smoke_media WHERE suggested_smoke_id = ? ORDER BY created_at',
    [suggestedSmokeId],
    (err, rows) => {
      if (err) {
        reject(err);
        return;
      }

      resolve(rows ?? []);
    }
  );
});

// Функция для одобрения предложенной гранаты (перенос в основную таблицу)
export const approveSuggestedSmoke = (suggestedSmokeId: number): Promise<number> => new Promise((resolve, reject) => {
  db.serialize(() => {
    // Получаем данные предложенной гранаты
    db.get<SuggestedSmoke>('SELECT * FROM suggested_smokes WHERE id = ?', [suggestedSmokeId], (err, suggestedSmoke) => {
      if (err) {
        reject(err);
        return;
      }

      if (!suggestedSmoke) {
        reject(new Error('Предложенная граната не найдена'));
        return;
      }

      // Добавляем в основную таблицу
      db.run(
        `
          INSERT INTO smokes (map_id, name, lineup_instructions, image_url, difficulty, side, line, grenade_type)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `,
        [
          suggestedSmoke.map_id,
          suggestedSmoke.name,
          suggestedSmoke.lineup_instructions,
          suggestedSmoke.image_url,
          suggestedSmoke.difficulty,
          suggestedSmoke.side,
          suggestedSmoke.line,
          suggestedSmoke.grenade_type
        ],
        function insertCallback(err) {
          if (err) {
            reject(err);
            return;
          }

          const newSmokeId = this.lastID ?? 0;

          // Переносим медиафайлы
          db.run(
            `
            INSERT INTO smoke_media (smoke_id, file_id, media_type, caption, created_at)
            SELECT ?, file_id, media_type, caption, created_at
            FROM suggested_smoke_media
            WHERE suggested_smoke_id = ?
          `,
          [newSmokeId, suggestedSmokeId],
          (err) => {
            if (err) {
              reject(err);
              return;
            }

            // Удаляем медиафайлы предложенной гранаты
            db.run('DELETE FROM suggested_smoke_media WHERE suggested_smoke_id = ?', [suggestedSmokeId], (err) => {
              if (err) {
                reject(err);
                return;
              }

              // Удаляем предложенную гранату
              db.run('DELETE FROM suggested_smokes WHERE id = ?', [suggestedSmokeId], function cleanup(err) {
                if (err) {
                  reject(err);
                  return;
                }

                resolve(newSmokeId);
              });
            });
          }
        );
        }
      );
    });
  });
});

// Функция для отклонения предложенной гранаты
export const rejectSuggestedSmoke = (suggestedSmokeId: number): Promise<number> => new Promise((resolve, reject) => {
  db.serialize(() => {
    // Удаляем медиафайлы
    db.run('DELETE FROM suggested_smoke_media WHERE suggested_smoke_id = ?', [suggestedSmokeId], (err) => {
      if (err) {
        reject(err);
        return;
      }

      // Удаляем предложенную гранату
      db.run('DELETE FROM suggested_smokes WHERE id = ?', [suggestedSmokeId], function remove(err) {
        if (err) {
          reject(err);
          return;
        }

        resolve(this.changes ?? 0);
      });
    });
  });
});