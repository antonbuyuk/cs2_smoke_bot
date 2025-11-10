const sqlite3 = require('sqlite3').verbose();
const path = require('path');

let db;

const initDatabase = () => {
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

const getMaps = () => {
  return new Promise((resolve, reject) => {
    db.all('SELECT * FROM maps ORDER BY display_name', (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
};

const getSmokesByMap = (mapName) => {
  return new Promise((resolve, reject) => {
    db.all(`
      SELECT s.*, m.name as map_name, m.display_name as map_display_name
      FROM smokes s
      JOIN maps m ON s.map_id = m.id
      WHERE m.name = ?
      ORDER BY s.name
    `, [mapName], (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
};

const getAllSmokes = () => {
  return new Promise((resolve, reject) => {
    db.all(`
      SELECT s.*, m.name as map_name, m.display_name as map_display_name
      FROM smokes s
      JOIN maps m ON s.map_id = m.id
      ORDER BY m.display_name, s.name
    `, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
};

const addSmoke = (mapName, smokeData) => {
  return new Promise((resolve, reject) => {
    db.get('SELECT id FROM maps WHERE name = ?', [mapName], (err, map) => {
      if (err) {
        reject(err);
        return;
      }

      if (!map) {
        reject(new Error('Карта не найдена'));
        return;
      }

             db.run(`
         INSERT INTO smokes (map_id, name, lineup_instructions, image_url, difficulty, side, line, grenade_type)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)
       `, [map.id, smokeData.name, smokeData.lineup_instructions,
            smokeData.imageUrl || null, smokeData.difficulty, smokeData.side, smokeData.line || null, smokeData.grenadeType || 'smoke'], function(err) {
        if (err) reject(err);
        else resolve(this.lastID);
      });
    });
  });
};

// Функция для сохранения медиафайлов
const saveSmokeImage = (smokeId, fileId, mediaType = 'photo', caption = '') => {
  return new Promise((resolve, reject) => {
    db.run('INSERT INTO smoke_media (smoke_id, file_id, media_type, caption) VALUES (?, ?, ?, ?)',
           [smokeId, fileId, mediaType, caption], function(err) {
      if (err) reject(err);
      else resolve(this.lastID);
    });
  });
};

// Функция для получения медиафайлов смока
const getSmokeMedia = (smokeId) => {
  return new Promise((resolve, reject) => {
    db.all('SELECT * FROM smoke_media WHERE smoke_id = ? ORDER BY created_at', [smokeId], (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
};

// Функция для удаления смока
const deleteSmoke = (smokeId) => {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      // Сначала удаляем связанные медиафайлы
      db.run('DELETE FROM smoke_media WHERE smoke_id = ?', [smokeId], (err) => {
        if (err) {
          reject(err);
          return;
        }

        // Затем удаляем сам смок
        db.run('DELETE FROM smokes WHERE id = ?', [smokeId], function(err) {
          if (err) reject(err);
          else resolve(this.changes);
        });
      });
    });
  });
};

// Функция для получения смока по ID
const getSmokeById = (smokeId) => {
  return new Promise((resolve, reject) => {
    db.get(`
      SELECT s.*, m.name as map_name, m.display_name as map_display_name
      FROM smokes s
      JOIN maps m ON s.map_id = m.id
      WHERE s.id = ?
    `, [smokeId], (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
};

const clearAllSmokes = () => {
  return new Promise((resolve, reject) => {
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

          console.log('Все смоки и медиафайлы удалены из базы данных');
          resolve();
        });
      });
    });
  });
};

// Функции для работы с предложенными гранатами
const addSuggestedSmoke = (mapName, smokeData, userId, username) => {
  return new Promise((resolve, reject) => {
    db.get('SELECT id FROM maps WHERE name = ?', [mapName], (err, map) => {
      if (err) {
        reject(err);
        return;
      }

      if (!map) {
        reject(new Error('Карта не найдена'));
        return;
      }

      db.run(`
        INSERT INTO suggested_smokes (map_id, name, lineup_instructions, image_url, difficulty, side, line, grenade_type, user_id, username)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [map.id, smokeData.name, smokeData.lineup_instructions,
          smokeData.imageUrl || null, smokeData.difficulty, smokeData.side, smokeData.line || null, smokeData.grenadeType || 'smoke', userId, username], function(err) {
        if (err) reject(err);
        else resolve(this.lastID);
      });
    });
  });
};

// Функция для сохранения медиафайлов предложенных гранат
const saveSuggestedSmokeImage = (suggestedSmokeId, fileId, mediaType = 'photo', caption = '') => {
  return new Promise((resolve, reject) => {
    db.run('INSERT INTO suggested_smoke_media (suggested_smoke_id, file_id, media_type, caption) VALUES (?, ?, ?, ?)',
           [suggestedSmokeId, fileId, mediaType, caption], function(err) {
      if (err) reject(err);
      else resolve(this.lastID);
    });
  });
};

// Функция для получения всех предложенных гранат
const getAllSuggestedSmokes = () => {
  return new Promise((resolve, reject) => {
    db.all(`
      SELECT s.*, m.name as map_name, m.display_name as map_display_name
      FROM suggested_smokes s
      JOIN maps m ON s.map_id = m.id
      ORDER BY s.suggested_at DESC
    `, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
};

// Функция для получения предложенной гранаты по ID
const getSuggestedSmokeById = (suggestedSmokeId) => {
  return new Promise((resolve, reject) => {
    db.get(`
      SELECT s.*, m.name as map_name, m.display_name as map_display_name
      FROM suggested_smokes s
      JOIN maps m ON s.map_id = m.id
      WHERE s.id = ?
    `, [suggestedSmokeId], (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
};

// Функция для получения медиафайлов предложенной гранаты
const getSuggestedSmokeMedia = (suggestedSmokeId) => {
  return new Promise((resolve, reject) => {
    db.all('SELECT * FROM suggested_smoke_media WHERE suggested_smoke_id = ? ORDER BY created_at', [suggestedSmokeId], (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
};

// Функция для одобрения предложенной гранаты (перенос в основную таблицу)
const approveSuggestedSmoke = (suggestedSmokeId) => {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      // Получаем данные предложенной гранаты
      db.get('SELECT * FROM suggested_smokes WHERE id = ?', [suggestedSmokeId], (err, suggestedSmoke) => {
        if (err) {
          reject(err);
          return;
        }

        if (!suggestedSmoke) {
          reject(new Error('Предложенная граната не найдена'));
          return;
        }

        // Добавляем в основную таблицу
        db.run(`
          INSERT INTO smokes (map_id, name, lineup_instructions, image_url, difficulty, side, line, grenade_type)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `, [suggestedSmoke.map_id, suggestedSmoke.name, suggestedSmoke.lineup_instructions,
            suggestedSmoke.image_url, suggestedSmoke.difficulty, suggestedSmoke.side, suggestedSmoke.line, suggestedSmoke.grenade_type], function(err) {
          if (err) {
            reject(err);
            return;
          }

          const newSmokeId = this.lastID;

          // Переносим медиафайлы
          db.run(`
            INSERT INTO smoke_media (smoke_id, file_id, media_type, caption, created_at)
            SELECT ?, file_id, media_type, caption, created_at
            FROM suggested_smoke_media
            WHERE suggested_smoke_id = ?
          `, [newSmokeId, suggestedSmokeId], (err) => {
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
              db.run('DELETE FROM suggested_smokes WHERE id = ?', [suggestedSmokeId], function(err) {
                if (err) reject(err);
                else resolve(newSmokeId);
              });
            });
          });
        });
      });
    });
  });
};

// Функция для отклонения предложенной гранаты
const rejectSuggestedSmoke = (suggestedSmokeId) => {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      // Удаляем медиафайлы
      db.run('DELETE FROM suggested_smoke_media WHERE suggested_smoke_id = ?', [suggestedSmokeId], (err) => {
        if (err) {
          reject(err);
          return;
        }

        // Удаляем предложенную гранату
        db.run('DELETE FROM suggested_smokes WHERE id = ?', [suggestedSmokeId], function(err) {
          if (err) reject(err);
          else resolve(this.changes);
        });
      });
    });
  });
};

module.exports = {
  initDatabase,
  getMaps,
  getSmokesByMap,
  addSmoke,
  saveSmokeImage,
  getSmokeMedia,
  deleteSmoke,
  getSmokeById,
  clearAllSmokes,
  getAllSmokes,
  // Новые функции для предложенных гранат
  addSuggestedSmoke,
  saveSuggestedSmokeImage,
  getAllSuggestedSmokes,
  getSuggestedSmokeById,
  getSuggestedSmokeMedia,
  approveSuggestedSmoke,
  rejectSuggestedSmoke
};