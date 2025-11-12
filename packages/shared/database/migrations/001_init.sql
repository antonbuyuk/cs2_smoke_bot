-- Initial schema: normalized structure with reference tables
-- Reference tables
CREATE TABLE IF NOT EXISTS maps (
  id SERIAL PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  display_name TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS sides (
  id SERIAL PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  display_name TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS difficulties (
  id SERIAL PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  display_name TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS lines (
  id SERIAL PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  display_name TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS grenade_types (
  id SERIAL PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  display_name TEXT NOT NULL
);

-- Main tables
CREATE TABLE IF NOT EXISTS smokes (
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

CREATE TABLE IF NOT EXISTS smoke_media (
  id SERIAL PRIMARY KEY,
  smoke_id INTEGER NOT NULL REFERENCES smokes (id) ON DELETE CASCADE,
  file_id TEXT NOT NULL,
  media_type TEXT NOT NULL CHECK (media_type IN ('photo', 'video')),
  caption TEXT,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS suggested_smokes (
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
  user_id BIGINT,
  username TEXT,
  suggested_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS suggested_smoke_media (
  id SERIAL PRIMARY KEY,
  suggested_smoke_id INTEGER NOT NULL REFERENCES suggested_smokes (id) ON DELETE CASCADE,
  file_id TEXT NOT NULL,
  media_type TEXT NOT NULL CHECK (media_type IN ('photo', 'video')),
  caption TEXT,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_smokes_map_id ON smokes (map_id);
CREATE INDEX IF NOT EXISTS idx_smokes_difficulty_id ON smokes (difficulty_id);
CREATE INDEX IF NOT EXISTS idx_smokes_side_id ON smokes (side_id);
CREATE INDEX IF NOT EXISTS idx_smokes_line_id ON smokes (line_id);
CREATE INDEX IF NOT EXISTS idx_smokes_grenade_type_id ON smokes (grenade_type_id);
CREATE INDEX IF NOT EXISTS idx_smoke_media_smoke_id ON smoke_media (smoke_id);
CREATE INDEX IF NOT EXISTS idx_suggested_smokes_map_id ON suggested_smokes (map_id);
CREATE INDEX IF NOT EXISTS idx_suggested_smoke_media_suggested_smoke_id ON suggested_smoke_media (suggested_smoke_id);
