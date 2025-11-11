import sqlite3 from 'sqlite3';
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

interface MapIdRow {
  id: number;
}

export const initDatabase = () => {
  return new Promise((resolve, reject) => {
    const dbPath = process.env.DB_PATH || './data/smokes.db';

    db = new sqlite3.Database(dbPath, (err) => {
      if (err) {
        reject(err);
        return;
      }

      // Создание таблиц
      db.serialize(() => {
        // Таблица карт
        db.run(`CREATE TABLE IF NOT EXISTS maps (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT UNIQUE NOT NULL,
          display_name TEXT NOT NULL
        )`, (err) => {
          if (err) {
            reject(err);
            return;
          }

                  // Таблица гранат
        db.run(`CREATE TABLE IF NOT EXISTS smokes (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          map_id INTEGER,
          name TEXT NOT NULL,
          lineup_instructions TEXT NOT NULL,
          image_url TEXT,
          difficulty TEXT DEFAULT 'medium',
          side TEXT DEFAULT 'both',
          line TEXT,
          grenade_type TEXT DEFAULT 'smoke',
          FOREIGN KEY (map_id) REFERENCES maps (id)
        )`, (err) => {
            if (err) {
              reject(err);
              return;
            }

                        // Таблица медиафайлов
            db.run(`CREATE TABLE IF NOT EXISTS smoke_media (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              smoke_id INTEGER,
              file_id TEXT NOT NULL,
              media_type TEXT NOT NULL,
              caption TEXT,
              created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
              FOREIGN KEY (smoke_id) REFERENCES smokes (id)
            )`, (err) => {
              if (err) {
                reject(err);
                return;
              }

              // Таблица предложенных гранат
              db.run(`CREATE TABLE IF NOT EXISTS suggested_smokes (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                map_id INTEGER,
                name TEXT NOT NULL,
                lineup_instructions TEXT NOT NULL,
                image_url TEXT,
                difficulty TEXT DEFAULT 'medium',
                side TEXT DEFAULT 'both',
                line TEXT,
                grenade_type TEXT DEFAULT 'smoke',
                user_id INTEGER,
                username TEXT,
                suggested_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (map_id) REFERENCES maps (id)
              )`, (err) => {
                if (err) {
                  reject(err);
                  return;
                }

                // Таблица медиафайлов для предложенных гранат
                db.run(`CREATE TABLE IF NOT EXISTS suggested_smoke_media (
                  id INTEGER PRIMARY KEY AUTOINCREMENT,
                  suggested_smoke_id INTEGER,
                  file_id TEXT NOT NULL,
                  media_type TEXT NOT NULL,
                  caption TEXT,
                  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                  FOREIGN KEY (suggested_smoke_id) REFERENCES suggested_smokes (id)
                )`, (err) => {
                  if (err) {
                    reject(err);
                    return;
                  }
                });
              });
            });
          });
        });
      });
    });
  });
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