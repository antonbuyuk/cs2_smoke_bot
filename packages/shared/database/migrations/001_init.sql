-- Initial schema: maps, smokes, media, suggestions
CREATE TABLE IF NOT EXISTS maps (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT UNIQUE NOT NULL,
  display_name TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS smokes (
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
);

CREATE TABLE IF NOT EXISTS smoke_media (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  smoke_id INTEGER,
  file_id TEXT NOT NULL,
  media_type TEXT NOT NULL,
  caption TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (smoke_id) REFERENCES smokes (id)
);

CREATE TABLE IF NOT EXISTS suggested_smokes (
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
);

CREATE TABLE IF NOT EXISTS suggested_smoke_media (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  suggested_smoke_id INTEGER,
  file_id TEXT NOT NULL,
  media_type TEXT NOT NULL,
  caption TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (suggested_smoke_id) REFERENCES suggested_smokes (id)
);

