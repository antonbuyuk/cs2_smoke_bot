-- Полная структура базы данных cs2_bot
-- Выполни этот файл в базе данных cs2_bot для создания всей структуры

-- ============================================
-- 1. Удаление существующих таблиц (если есть)
-- ============================================
DROP TABLE IF EXISTS granade_media CASCADE;
DROP TABLE IF EXISTS granades CASCADE;
DROP TABLE IF EXISTS grenade_types CASCADE;
DROP TABLE IF EXISTS lines CASCADE;
DROP TABLE IF EXISTS difficulties CASCADE;
DROP TABLE IF EXISTS sides CASCADE;
DROP TABLE IF EXISTS maps CASCADE;

-- ============================================
-- 2. Создание справочных таблиц
-- ============================================

CREATE TABLE maps (
  id SERIAL PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  display_name TEXT NOT NULL
);

CREATE TABLE sides (
  id SERIAL PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  display_name TEXT NOT NULL
);

CREATE TABLE difficulties (
  id SERIAL PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  display_name TEXT NOT NULL
);

CREATE TABLE lines (
  id SERIAL PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  display_name TEXT NOT NULL
);

CREATE TABLE grenade_types (
  id SERIAL PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  display_name TEXT NOT NULL
);

-- ============================================
-- 3. Создание основных таблиц
-- ============================================

CREATE TABLE granades (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  display_name TEXT,
  map_id INTEGER NOT NULL REFERENCES maps (id) ON DELETE CASCADE,
  difficulty_id INTEGER NOT NULL REFERENCES difficulties (id) ON DELETE RESTRICT,
  side_id INTEGER NOT NULL REFERENCES sides (id) ON DELETE RESTRICT,
  line_id INTEGER REFERENCES lines (id) ON DELETE SET NULL,
  grenade_type_id INTEGER NOT NULL REFERENCES grenade_types (id) ON DELETE RESTRICT,
  lineup_instructions TEXT NOT NULL,
  image_url TEXT,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE granade_media (
  id SERIAL PRIMARY KEY,
  granade_id INTEGER NOT NULL REFERENCES granades (id) ON DELETE CASCADE,
  file_id TEXT NOT NULL,
  media_type TEXT NOT NULL CHECK (media_type IN ('photo', 'video')),
  caption TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- 4. Создание индексов для производительности
-- ============================================

CREATE INDEX idx_granades_map_id ON granades (map_id);
CREATE INDEX idx_granades_difficulty_id ON granades (difficulty_id);
CREATE INDEX idx_granades_side_id ON granades (side_id);
CREATE INDEX idx_granades_line_id ON granades (line_id);
CREATE INDEX idx_granades_grenade_type_id ON granades (grenade_type_id);
CREATE INDEX idx_granade_media_granade_id ON granade_media (granade_id);

-- ============================================
-- 5. Заполнение справочных таблиц данными
-- ============================================

-- Sides
INSERT INTO sides (name, display_name) VALUES
  ('t', 'T (Terrorists)'),
  ('ct', 'CT (Counter-Terrorists)'),
  ('both', 'Both sides');

-- Difficulties
INSERT INTO difficulties (name, display_name) VALUES
  ('easy', 'Easy'),
  ('medium', 'Medium'),
  ('hard', 'Hard');

-- Lines
INSERT INTO lines (name, display_name) VALUES
  ('plant_a', 'Plant A'),
  ('plant_b', 'Plant B'),
  ('mid', 'Mid'),
  ('all', 'All lines');

-- Grenade types
INSERT INTO grenade_types (name, display_name) VALUES
  ('smoke', 'Smoke'),
  ('flash', 'Flash'),
  ('molotov', 'Molotov'),
  ('he', 'HE Grenade'),
  ('all', 'All types');

-- Maps
INSERT INTO maps (name, display_name) VALUES
  ('dust2', 'Dust 2'),
  ('mirage', 'Mirage'),
  ('inferno', 'Inferno'),
  ('overpass', 'Overpass'),
  ('nuke', 'Nuke'),
  ('ancient', 'Ancient'),
  ('vertigo', 'Vertigo'),
  ('cache', 'Cache'),
  ('train', 'Train'),
  ('cobblestone', 'Cobblestone');

-- ============================================
-- Готово! Структура создана и заполнена данными
-- ============================================
