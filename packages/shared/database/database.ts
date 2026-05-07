/// <reference types="node" />

import { Pool, type PoolClient } from 'pg';
import type {
  NewSmokeInput,
  MediaType,
  SmokeMediaRecord,
  SmokeWithMap,
  MapRecord,
  RealMapKey,
  SideRecord,
  DifficultyRecord,
  LineRecord,
  GrenadeTypeRecord,
  UserRecord,
  ProgressStatus,
  ProgressRecord,
} from '../utils/types';
import type {
  DifficultyKey,
  SideKey,
  LineKey,
  GrenadeTypeKey,
  MapKey,
} from '../utils/guards';

let pool: Pool | undefined;
let databaseInitialized = false;

type Queryable = Pool | PoolClient;

const getPool = (): Pool => {
  if (!pool) {
    throw new Error('Database has not been initialized. Call initDatabase() before using it.');
  }

  return pool;
};

const withTransaction = async <T>(callback: (client: PoolClient) => Promise<T>): Promise<T> => {
  const client = await getPool().connect();

  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

// Проверка существования таблицы
const tableExists = async (tableName: string): Promise<boolean> => {
  const { rows } = await getPool().query<{ exists: boolean }>(
    `SELECT EXISTS (
      SELECT FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_name = $1
    )`,
    [tableName]
  );
  return rows[0]?.exists ?? false;
};

// Проверка существования колонки в таблице
const columnExists = async (client: Queryable, tableName: string, columnName: string): Promise<boolean> => {
  const { rows } = await client.query<{ exists: boolean }>(
    `SELECT EXISTS (
      SELECT FROM information_schema.columns
      WHERE table_schema = 'public'
      AND table_name = $1
      AND column_name = $2
    )`,
    [tableName, columnName]
  );
  return rows[0]?.exists ?? false;
};

// Миграция для добавления недостающих колонок
const runMigrations = async (client: PoolClient) => {
  // Проверяем, существует ли таблица granade_media
  const granadeMediaExists = await tableExists('granade_media');

  if (granadeMediaExists) {
    // Добавляем sort_order в granade_media, если его нет
    const sortOrderExists = await columnExists(client, 'granade_media', 'sort_order');
    if (!sortOrderExists) {
      await client.query(`
        ALTER TABLE granade_media
        ADD COLUMN sort_order INTEGER DEFAULT 0
      `);
      console.log('Added sort_order column to granade_media table');
    }
  }

  // Колонка position_image_url для maps (картинка-схема карты)
  const mapsExistsForMigration = await tableExists('maps');
  if (mapsExistsForMigration) {
    const positionImageExists = await columnExists(client, 'maps', 'position_image_url');
    if (!positionImageExists) {
      await client.query('ALTER TABLE maps ADD COLUMN position_image_url TEXT');
      console.log('Added position_image_url column to maps table');
    }
  }

  // Таблица пользователей
  const usersExists = await tableExists('users');
  if (!usersExists) {
    await client.query(`
      CREATE TABLE users (
        telegram_id BIGINT PRIMARY KEY,
        username    TEXT,
        first_name  TEXT NOT NULL,
        last_name   TEXT,
        photo_url   TEXT,
        role        TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('admin', 'user')),
        created_at  TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        updated_at  TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await client.query('CREATE INDEX idx_users_role ON users (role)');
    console.log('Created users table');
  }

  // Колонки статуса и автора для гранат
  const granadesExists = await tableExists('granades');
  if (granadesExists) {
    const statusExists = await columnExists(client, 'granades', 'status');
    if (!statusExists) {
      await client.query(`
        ALTER TABLE granades
        ADD COLUMN status TEXT NOT NULL DEFAULT 'approved'
          CHECK (status IN ('pending', 'approved', 'rejected'))
      `);
      await client.query('CREATE INDEX idx_granades_status ON granades (status)');
      console.log('Added status column to granades table');
    }

    const createdByExists = await columnExists(client, 'granades', 'created_by');
    if (!createdByExists) {
      await client.query(`
        ALTER TABLE granades
        ADD COLUMN created_by BIGINT REFERENCES users(telegram_id) ON DELETE SET NULL
      `);
      await client.query('CREATE INDEX idx_granades_created_by ON granades (created_by)');
      console.log('Added created_by column to granades table');
    }
  }

  // Flashcard-deck: личный прогресс юзера по гранатам
  const granadeProgressExists = await tableExists('granade_progress');
  if (!granadeProgressExists) {
    await client.query(`
      CREATE TABLE granade_progress (
        user_id    BIGINT  NOT NULL REFERENCES users (telegram_id) ON DELETE CASCADE,
        granade_id INTEGER NOT NULL REFERENCES granades (id)       ON DELETE CASCADE,
        status     TEXT    NOT NULL CHECK (status IN ('want', 'learning', 'learned')),
        updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (user_id, granade_id)
      )
    `);
    await client.query('CREATE INDEX idx_granade_progress_user_status ON granade_progress (user_id, status)');
    console.log('Created granade_progress table');
  }
};

// Создание структуры базы данных
const createDatabaseStructure = async () => {
  const client = await getPool().connect();

  try {
    await client.query('BEGIN');

    // Проверяем, существует ли хотя бы одна таблица
    const mapsExists = await tableExists('maps');

    if (mapsExists) {
      // Структура уже создана, но нужно проверить миграции
      await runMigrations(client);
      await client.query('COMMIT');
      return;
    }

    // Создание справочных таблиц
    await client.query(`
      CREATE TABLE maps (
        id SERIAL PRIMARY KEY,
        name TEXT UNIQUE NOT NULL,
        display_name TEXT NOT NULL,
        position_image_url TEXT
      )
    `);

    await client.query(`
      CREATE TABLE sides (
        id SERIAL PRIMARY KEY,
        name TEXT UNIQUE NOT NULL,
        display_name TEXT NOT NULL
      )
    `);

    await client.query(`
      CREATE TABLE difficulties (
        id SERIAL PRIMARY KEY,
        name TEXT UNIQUE NOT NULL,
        display_name TEXT NOT NULL
      )
    `);

    await client.query(`
      CREATE TABLE lines (
        id SERIAL PRIMARY KEY,
        name TEXT UNIQUE NOT NULL,
        display_name TEXT NOT NULL
      )
    `);

    await client.query(`
      CREATE TABLE grenade_types (
        id SERIAL PRIMARY KEY,
        name TEXT UNIQUE NOT NULL,
        display_name TEXT NOT NULL
      )
    `);

    // Создание основных таблиц
    await client.query(`
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
      )
    `);

    await client.query(`
      CREATE TABLE granade_media (
        id SERIAL PRIMARY KEY,
        granade_id INTEGER NOT NULL REFERENCES granades (id) ON DELETE CASCADE,
        file_id TEXT NOT NULL,
        media_type TEXT NOT NULL CHECK (media_type IN ('photo', 'video')),
        caption TEXT,
        sort_order INTEGER DEFAULT 0,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Создание индексов
    await client.query('CREATE INDEX idx_granades_map_id ON granades (map_id)');
    await client.query('CREATE INDEX idx_granades_difficulty_id ON granades (difficulty_id)');
    await client.query('CREATE INDEX idx_granades_side_id ON granades (side_id)');
    await client.query('CREATE INDEX idx_granades_line_id ON granades (line_id)');
    await client.query('CREATE INDEX idx_granades_grenade_type_id ON granades (grenade_type_id)');
    await client.query('CREATE INDEX idx_granade_media_granade_id ON granade_media (granade_id)');

    // Запускаем миграции для существующих таблиц
    await runMigrations(client);

    // Заполнение справочных таблиц данными
    await client.query(`
      INSERT INTO sides (name, display_name) VALUES
        ('t', 'T (Terrorists)'),
        ('ct', 'CT (Counter-Terrorists)'),
        ('both', 'Both sides')
      ON CONFLICT (name) DO NOTHING
    `);

    await client.query(`
      INSERT INTO difficulties (name, display_name) VALUES
        ('easy', 'Easy'),
        ('medium', 'Medium'),
        ('hard', 'Hard')
      ON CONFLICT (name) DO NOTHING
    `);

    await client.query(`
      INSERT INTO lines (name, display_name) VALUES
        ('plant_a', 'Plant A'),
        ('plant_b', 'Plant B'),
        ('mid', 'Mid')
      ON CONFLICT (name) DO NOTHING
    `);

    await client.query(`
      INSERT INTO grenade_types (name, display_name) VALUES
        ('smoke', 'Smoke'),
        ('flash', 'Flash'),
        ('molotov', 'Molotov'),
        ('he', 'HE Grenade')
      ON CONFLICT (name) DO NOTHING
    `);

    await client.query(`
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
        ('cobblestone', 'Cobblestone')
      ON CONFLICT (name) DO NOTHING
    `);

    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

// Helper functions to resolve reference IDs from string keys
const resolveMapId = async (client: Queryable, mapName: string): Promise<number> => {
  const { rows } = await client.query<{ id: number }>('SELECT id FROM maps WHERE name = $1', [mapName]);
  const mapRow = rows[0];

  if (!mapRow) {
    throw new Error(`Карта не найдена: ${mapName}`);
  }

  return mapRow.id;
};

const resolveSideId = async (client: Queryable, sideName: string): Promise<number> => {
  const { rows } = await client.query<{ id: number }>('SELECT id FROM sides WHERE name = $1', [sideName]);
  const sideRow = rows[0];

  if (!sideRow) {
    throw new Error(`Сторона не найдена: ${sideName}`);
  }

  return sideRow.id;
};

const resolveDifficultyId = async (client: Queryable, difficultyName: string): Promise<number> => {
  const { rows } = await client.query<{ id: number }>('SELECT id FROM difficulties WHERE name = $1', [difficultyName]);
  const difficultyRow = rows[0];

  if (!difficultyRow) {
    throw new Error(`Сложность не найдена: ${difficultyName}`);
  }

  return difficultyRow.id;
};

const resolveLineId = async (client: Queryable, lineName: string | null | undefined): Promise<number | null> => {
  if (!lineName || lineName === 'all') {
    return null;
  }

  const { rows } = await client.query<{ id: number }>('SELECT id FROM lines WHERE name = $1', [lineName]);
  const lineRow = rows[0];

  if (!lineRow) {
    throw new Error(`Линия не найдена: ${lineName}`);
  }

  return lineRow.id;
};

const resolveGrenadeTypeId = async (client: Queryable, grenadeTypeName: string): Promise<number> => {
  const { rows } = await client.query<{ id: number }>('SELECT id FROM grenade_types WHERE name = $1', [grenadeTypeName]);
  const grenadeTypeRow = rows[0];

  if (!grenadeTypeRow) {
    throw new Error(`Тип гранаты не найден: ${grenadeTypeName}`);
  }

  return grenadeTypeRow.id;
};

// Mapper to convert DB record (with IDs) to public format (with string keys)
interface SmokeRowDB {
  id: number;
  name: string;
  display_name: string | null;
  map_id: number;
  map_name: string;
  map_display_name: string;
  difficulty_id: number;
  difficulty_name: string;
  side_id: number;
  side_name: string;
  line_id: number | null;
  line_name: string | null;
  grenade_type_id: number;
  grenade_type_name: string;
  lineup_instructions: string;
  image_url: string | null;
  cover_file_id?: string | null;
  status: 'pending' | 'approved' | 'rejected';
  created_by: number | null;
}

const mapSmokeRowToPublic = (row: SmokeRowDB): SmokeWithMap => ({
  id: row.id,
  map_id: row.map_id,
  name: row.name,
  lineup_instructions: row.lineup_instructions,
  image_url: row.image_url,
  difficulty: row.difficulty_name as DifficultyKey,
  side: row.side_name as SideKey,
  line: (row.line_name ?? null) as LineKey | null,
  grenade_type: row.grenade_type_name as GrenadeTypeKey,
  map_name: row.map_name as MapKey,
  map_display_name: row.map_display_name,
  cover_file_id: row.cover_file_id ?? null,
  status: row.status ?? 'approved',
  created_by: row.created_by ?? null,
});

const toNullable = <T>(value: T | undefined | null): T | null => value ?? null;

export const initDatabase = async (): Promise<void> => {
  if (!pool) {
    const connectionString = process.env.DATABASE_URL ?? 'postgres://postgres:postgres@localhost:5432/cs2_bot';

    if (!process.env.DATABASE_URL) {
      console.warn('[admin] DATABASE_URL not set, using default: postgres://postgres:postgres@localhost:5432/cs2_bot');
    }

    pool = new Pool({ connectionString });

    // Test connection
    try {
      await pool.query('SELECT 1');
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to connect to PostgreSQL: ${message}\n\nMake sure PostgreSQL is running and DATABASE_URL is correct.\nExample: postgres://user:password@localhost:5432/dbname`);
    }
  }

  if (databaseInitialized) {
    return;
  }

  try {
    await createDatabaseStructure();
    databaseInitialized = true;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to initialize database: ${message}`);
  }
};

export const getMaps = async (): Promise<MapRecord[]> => {
  const { rows } = await getPool().query<MapRecord>(
    'SELECT id, name, display_name, position_image_url FROM maps ORDER BY display_name'
  );
  return rows;
};

export const getMapById = async (id: number): Promise<MapRecord | null> => {
  const { rows } = await getPool().query<MapRecord>(
    'SELECT id, name, display_name, position_image_url FROM maps WHERE id = $1',
    [id]
  );
  return rows[0] ?? null;
};

export const setMapPositionImage = async (
  id: number,
  imageUrl: string | null
): Promise<string | null> => {
  return withTransaction(async (client) => {
    const { rows: currentRows } = await client.query<{ position_image_url: string | null }>(
      'SELECT position_image_url FROM maps WHERE id = $1 FOR UPDATE',
      [id]
    );

    if (currentRows.length === 0) {
      throw new Error(`Карта не найдена: ${id}`);
    }

    const previousUrl = currentRows[0]?.position_image_url ?? null;

    await client.query('UPDATE maps SET position_image_url = $2 WHERE id = $1', [id, imageUrl]);

    return previousUrl;
  });
};

export const addMap = async (name: string, displayName: string): Promise<number> => {
  const { rows } = await getPool().query<{ id: number }>(
    'INSERT INTO maps (name, display_name) VALUES ($1, $2) ON CONFLICT (name) DO NOTHING RETURNING id',
    [name, displayName]
  );

  if (rows.length === 0) {
    throw new Error(`Карта с именем "${name}" уже существует`);
  }

  return rows[0]?.id ?? 0;
};

// Sides functions
export const getSides = async (): Promise<SideRecord[]> => {
  const { rows } = await getPool().query<SideRecord>('SELECT id, name, display_name FROM sides ORDER BY display_name');
  return rows;
};

export const addSide = async (name: string, displayName: string): Promise<number> => {
  const { rows } = await getPool().query<{ id: number }>(
    'INSERT INTO sides (name, display_name) VALUES ($1, $2) ON CONFLICT (name) DO NOTHING RETURNING id',
    [name, displayName]
  );

  if (rows.length === 0) {
    throw new Error(`Сторона с именем "${name}" уже существует`);
  }

  return rows[0]?.id ?? 0;
};

// Difficulties functions
export const getDifficulties = async (): Promise<DifficultyRecord[]> => {
  const { rows } = await getPool().query<DifficultyRecord>('SELECT id, name, display_name FROM difficulties ORDER BY display_name');
  return rows;
};

export const addDifficulty = async (name: string, displayName: string): Promise<number> => {
  const { rows } = await getPool().query<{ id: number }>(
    'INSERT INTO difficulties (name, display_name) VALUES ($1, $2) ON CONFLICT (name) DO NOTHING RETURNING id',
    [name, displayName]
  );

  if (rows.length === 0) {
    throw new Error(`Сложность с именем "${name}" уже существует`);
  }

  return rows[0]?.id ?? 0;
};

// Lines functions
export const getLines = async (): Promise<LineRecord[]> => {
  const { rows } = await getPool().query<LineRecord>('SELECT id, name, display_name FROM lines ORDER BY display_name');
  return rows;
};

export const addLine = async (name: string, displayName: string): Promise<number> => {
  const { rows } = await getPool().query<{ id: number }>(
    'INSERT INTO lines (name, display_name) VALUES ($1, $2) ON CONFLICT (name) DO NOTHING RETURNING id',
    [name, displayName]
  );

  if (rows.length === 0) {
    throw new Error(`Линия с именем "${name}" уже существует`);
  }

  return rows[0]?.id ?? 0;
};

// Grenade types functions
export const getGrenadeTypes = async (): Promise<GrenadeTypeRecord[]> => {
  const { rows } = await getPool().query<GrenadeTypeRecord>('SELECT id, name, display_name FROM grenade_types ORDER BY display_name');
  return rows;
};

export const addGrenadeType = async (name: string, displayName: string): Promise<number> => {
  const { rows } = await getPool().query<{ id: number }>(
    'INSERT INTO grenade_types (name, display_name) VALUES ($1, $2) ON CONFLICT (name) DO NOTHING RETURNING id',
    [name, displayName]
  );

  if (rows.length === 0) {
    throw new Error(`Тип гранаты с именем "${name}" уже существует`);
  }

  return rows[0]?.id ?? 0;
};

// Функции проверки использования записей
export const isMapUsed = async (id: number): Promise<boolean> => {
  const { rows } = await getPool().query('SELECT COUNT(*) as count FROM granades WHERE map_id = $1', [id]);
  return Number.parseInt(rows[0]?.count ?? '0', 10) > 0;
};

export const isSideUsed = async (id: number): Promise<boolean> => {
  const { rows } = await getPool().query('SELECT COUNT(*) as count FROM granades WHERE side_id = $1', [id]);
  return Number.parseInt(rows[0]?.count ?? '0', 10) > 0;
};

export const isDifficultyUsed = async (id: number): Promise<boolean> => {
  const { rows } = await getPool().query('SELECT COUNT(*) as count FROM granades WHERE difficulty_id = $1', [id]);
  return Number.parseInt(rows[0]?.count ?? '0', 10) > 0;
};

export const isLineUsed = async (id: number): Promise<boolean> => {
  const { rows } = await getPool().query('SELECT COUNT(*) as count FROM granades WHERE line_id = $1', [id]);
  return Number.parseInt(rows[0]?.count ?? '0', 10) > 0;
};

export const isGrenadeTypeUsed = async (id: number): Promise<boolean> => {
  const { rows } = await getPool().query('SELECT COUNT(*) as count FROM granades WHERE grenade_type_id = $1', [id]);
  return Number.parseInt(rows[0]?.count ?? '0', 10) > 0;
};

// Функции получения количества использований
export const getMapUsageCount = async (id: number): Promise<number> => {
  const { rows } = await getPool().query('SELECT COUNT(*) as count FROM granades WHERE map_id = $1', [id]);
  return Number.parseInt(rows[0]?.count ?? '0', 10);
};

export const getSideUsageCount = async (id: number): Promise<number> => {
  const { rows } = await getPool().query('SELECT COUNT(*) as count FROM granades WHERE side_id = $1', [id]);
  return Number.parseInt(rows[0]?.count ?? '0', 10);
};

export const getDifficultyUsageCount = async (id: number): Promise<number> => {
  const { rows } = await getPool().query('SELECT COUNT(*) as count FROM granades WHERE difficulty_id = $1', [id]);
  return Number.parseInt(rows[0]?.count ?? '0', 10);
};

export const getLineUsageCount = async (id: number): Promise<number> => {
  const { rows } = await getPool().query('SELECT COUNT(*) as count FROM granades WHERE line_id = $1', [id]);
  return Number.parseInt(rows[0]?.count ?? '0', 10);
};

export const getGrenadeTypeUsageCount = async (id: number): Promise<number> => {
  const { rows } = await getPool().query('SELECT COUNT(*) as count FROM granades WHERE grenade_type_id = $1', [id]);
  return Number.parseInt(rows[0]?.count ?? '0', 10);
};

// Функция для получения количества записей во всех справочных таблицах одним запросом
export const getReferenceTablesCounts = async (): Promise<{
  maps: number;
  sides: number;
  difficulties: number;
  lines: number;
  grenadeTypes: number;
}> => {
  const { rows } = await getPool().query(`
    SELECT
      (SELECT COUNT(*) FROM maps) as maps,
      (SELECT COUNT(*) FROM sides) as sides,
      (SELECT COUNT(*) FROM difficulties) as difficulties,
      (SELECT COUNT(*) FROM lines) as lines,
      (SELECT COUNT(*) FROM grenade_types) as grenade_types
  `);

  const row = rows[0];
  return {
    maps: Number.parseInt(row?.maps ?? '0', 10),
    sides: Number.parseInt(row?.sides ?? '0', 10),
    difficulties: Number.parseInt(row?.difficulties ?? '0', 10),
    lines: Number.parseInt(row?.lines ?? '0', 10),
    grenadeTypes: Number.parseInt(row?.grenade_types ?? '0', 10),
  };
};

// Класс ошибки для использования записи
export class RecordInUseError extends Error {
  constructor(
    public readonly recordType: string,
    public readonly recordId: number,
    public readonly usageCount: number
  ) {
    const recordTypeNames: Record<string, string> = {
      map: 'карту',
      side: 'сторону',
      difficulty: 'сложность',
      line: 'линию',
      grenade_type: 'тип гранаты',
    };

    const recordName = recordTypeNames[recordType] || recordType.toLowerCase();
    const countText = usageCount === 1 ? '1 гранате' : `${usageCount} гранатам`;
    super(`Невозможно удалить ${recordName}: запись используется в ${countText}`);
    this.name = 'RecordInUseError';
  }
}

export const deleteMap = async (id: number): Promise<number> => {
  // Maps можно удалять (CASCADE), но предупреждаем пользователя
  const usageCount = await getMapUsageCount(id);
  if (usageCount > 0) {
    throw new RecordInUseError('map', id, usageCount);
  }

  const result = await getPool().query('DELETE FROM maps WHERE id = $1', [id]);
  return result.rowCount ?? 0;
};

export const deleteSide = async (id: number): Promise<number> => {
  // Sides нельзя удалять если используются (RESTRICT)
  const usageCount = await getSideUsageCount(id);
  if (usageCount > 0) {
    throw new RecordInUseError('side', id, usageCount);
  }

  const result = await getPool().query('DELETE FROM sides WHERE id = $1', [id]);
  return result.rowCount ?? 0;
};

export const deleteDifficulty = async (id: number): Promise<number> => {
  // Difficulties нельзя удалять если используются (RESTRICT)
  const usageCount = await getDifficultyUsageCount(id);
  if (usageCount > 0) {
    throw new RecordInUseError('difficulty', id, usageCount);
  }

  const result = await getPool().query('DELETE FROM difficulties WHERE id = $1', [id]);
  return result.rowCount ?? 0;
};

export const deleteLine = async (id: number): Promise<number> => {
  // Lines можно удалять (SET NULL), но предупреждаем пользователя
  const usageCount = await getLineUsageCount(id);
  if (usageCount > 0) {
    throw new RecordInUseError('line', id, usageCount);
  }

  const result = await getPool().query('DELETE FROM lines WHERE id = $1', [id]);
  return result.rowCount ?? 0;
};

export const deleteGrenadeType = async (id: number): Promise<number> => {
  // Grenade types нельзя удалять если используются (RESTRICT)
  const usageCount = await getGrenadeTypeUsageCount(id);
  if (usageCount > 0) {
    throw new RecordInUseError('grenade_type', id, usageCount);
  }

  const result = await getPool().query('DELETE FROM grenade_types WHERE id = $1', [id]);
  return result.rowCount ?? 0;
};

const SMOKE_SELECT_FIELDS = `
  g.id,
  g.name,
  g.display_name,
  g.map_id,
  m.name AS map_name,
  m.display_name AS map_display_name,
  g.difficulty_id,
  d.name AS difficulty_name,
  g.side_id,
  si.name AS side_name,
  g.line_id,
  l.name AS line_name,
  g.grenade_type_id,
  gt.name AS grenade_type_name,
  g.lineup_instructions,
  g.image_url,
  g.status,
  g.created_by,
  cm.file_id AS cover_file_id
`;

const SMOKE_JOINS = `
  FROM granades g
  JOIN maps m ON g.map_id = m.id
  JOIN difficulties d ON g.difficulty_id = d.id
  JOIN sides si ON g.side_id = si.id
  LEFT JOIN lines l ON g.line_id = l.id
  JOIN grenade_types gt ON g.grenade_type_id = gt.id
  LEFT JOIN LATERAL (
    SELECT file_id
    FROM granade_media
    WHERE granade_id = g.id AND media_type = 'photo'
    ORDER BY sort_order ASC, id ASC
    LIMIT 1
  ) cm ON true
`;

export const getSmokesByMap = async (mapName: RealMapKey): Promise<SmokeWithMap[]> => {
  const { rows } = await getPool().query<SmokeRowDB>(
    `SELECT ${SMOKE_SELECT_FIELDS} ${SMOKE_JOINS} WHERE m.name = $1 AND g.status = 'approved' ORDER BY g.created_at DESC`,
    [mapName]
  );
  return rows.map(mapSmokeRowToPublic);
};

export const getAllSmokes = async (): Promise<SmokeWithMap[]> => {
  const { rows } = await getPool().query<SmokeRowDB>(
    `SELECT ${SMOKE_SELECT_FIELDS} ${SMOKE_JOINS} WHERE g.status = 'approved' ORDER BY g.created_at DESC`
  );
  return rows.map(mapSmokeRowToPublic);
};

export const getPendingSmokes = async (): Promise<SmokeWithMap[]> => {
  const { rows } = await getPool().query<SmokeRowDB>(
    `SELECT ${SMOKE_SELECT_FIELDS} ${SMOKE_JOINS} WHERE g.status = 'pending' ORDER BY g.created_at DESC`
  );
  return rows.map(mapSmokeRowToPublic);
};

export const setSmokeStatus = async (smokeId: number, status: 'approved' | 'rejected'): Promise<void> => {
  await getPool().query('UPDATE granades SET status = $2 WHERE id = $1', [smokeId, status]);
};

export const addSmokeWithStatus = async (
  mapName: string,
  smokeData: NewSmokeInput,
  createdBy: number | null,
  status: 'pending' | 'approved'
): Promise<number> => {
  return withTransaction(async (client) => {
    try {
      const mapId = await resolveMapId(client, mapName);
      const difficultyId = await resolveDifficultyId(client, smokeData.difficulty);
      const sideId = await resolveSideId(client, smokeData.side);
      const lineId = await resolveLineId(client, smokeData.line);
      const grenadeTypeId = await resolveGrenadeTypeId(client, smokeData.grenadeType ?? 'smoke');
      const createdBySafe =
        typeof createdBy === 'number' && Number.isFinite(createdBy) && createdBy > 0 ? createdBy : null;

      const insertResult = await client.query<{ id: number }>(
        `
          INSERT INTO granades (map_id, name, display_name, lineup_instructions, image_url, difficulty_id, side_id, line_id, grenade_type_id, status, created_by)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
          RETURNING id
        `,
        [
          mapId,
          smokeData.name,
          null,
          smokeData.lineup_instructions,
          toNullable(smokeData.imageUrl),
          difficultyId,
          sideId,
          lineId,
          grenadeTypeId,
          status,
          createdBySafe,
        ]
      );

      return insertResult.rows[0]?.id ?? 0;
    } catch (error) {
      console.error('Error in addSmokeWithStatus:', error);
      throw error;
    }
  });
};

export const addSmoke = async (mapName: string, smokeData: NewSmokeInput): Promise<number> => {
  return addSmokeWithStatus(mapName, smokeData, null, 'approved');
};

export const saveSmokeImage = async (
  smokeId: number,
  fileId: string,
  mediaType: MediaType = 'photo',
  caption: string | null = null,
  sortOrder: number = 0
): Promise<number> => {
  const { rows } = await getPool().query<{ id: number }>(
    'INSERT INTO granade_media (granade_id, file_id, media_type, caption, sort_order) VALUES ($1, $2, $3, $4, $5) RETURNING id',
    [smokeId, fileId, mediaType, caption, sortOrder]
  );

  return rows[0]?.id ?? 0;
};

export const saveSmokeMediaBatch = async (
  smokeId: number,
  mediaFiles: Array<{ fileId: string; mediaType: MediaType; caption?: string | null; sortOrder: number }>
): Promise<number[]> => {
  return withTransaction(async (client) => {
    const ids: number[] = [];

    for (const media of mediaFiles) {
      // Валидация данных
      if (!media.fileId || typeof media.fileId !== 'string') {
        throw new Error(`Invalid fileId: ${media.fileId}`);
      }
      if (!media.mediaType || (media.mediaType !== 'photo' && media.mediaType !== 'video')) {
        throw new Error(`Invalid mediaType: ${media.mediaType}`);
      }
      if (typeof media.sortOrder !== 'number') {
        throw new Error(`Invalid sortOrder: ${media.sortOrder}`);
      }

      const { rows } = await client.query<{ id: number }>(
        'INSERT INTO granade_media (granade_id, file_id, media_type, caption, sort_order) VALUES ($1, $2, $3, $4, $5) RETURNING id',
        [smokeId, media.fileId, media.mediaType, media.caption ?? null, media.sortOrder]
      );

      ids.push(rows[0]?.id ?? 0);
    }

    return ids;
  });
};

export const getSmokeMedia = async (smokeId: number): Promise<SmokeMediaRecord[]> => {
  const { rows } = await getPool().query<SmokeMediaRecord>(
    `
      SELECT id, granade_id as smoke_id, file_id, media_type, caption, created_at
      FROM granade_media
      WHERE granade_id = $1
      ORDER BY sort_order ASC, created_at ASC
    `,
    [smokeId]
  );

  return rows;
};

export const deleteSmoke = async (smokeId: number): Promise<number> => {
  return withTransaction(async (client) => {
    await client.query('DELETE FROM granade_media WHERE granade_id = $1', [smokeId]);
    const result = await client.query('DELETE FROM granades WHERE id = $1', [smokeId]);
    return result.rowCount ?? 0;
  });
};

export const getSmokeById = async (smokeId: number): Promise<SmokeWithMap | undefined> => {
  const { rows } = await getPool().query<SmokeRowDB>(
    `SELECT ${SMOKE_SELECT_FIELDS} ${SMOKE_JOINS} WHERE g.id = $1 LIMIT 1`,
    [smokeId]
  );

  return rows[0] ? mapSmokeRowToPublic(rows[0]) : undefined;
};

export const clearAllSmokes = async (): Promise<void> => {
  await withTransaction(async (client) => {
    await client.query('DELETE FROM granade_media');
    await client.query('DELETE FROM granades');
  });
};

// Функции валидации через БД
export const isValidMapName = async (mapName: string): Promise<boolean> => {
  const { rows } = await getPool().query<{ count: string }>(
    'SELECT COUNT(*) as count FROM maps WHERE name = $1',
    [mapName]
  );
  return Number.parseInt(rows[0]?.count ?? '0', 10) > 0;
};

export const isValidSideName = async (sideName: string): Promise<boolean> => {
  const { rows } = await getPool().query<{ count: string }>(
    'SELECT COUNT(*) as count FROM sides WHERE name = $1',
    [sideName]
  );
  return Number.parseInt(rows[0]?.count ?? '0', 10) > 0;
};

export const isValidDifficultyName = async (difficultyName: string): Promise<boolean> => {
  const { rows } = await getPool().query<{ count: string }>(
    'SELECT COUNT(*) as count FROM difficulties WHERE name = $1',
    [difficultyName]
  );
  return Number.parseInt(rows[0]?.count ?? '0', 10) > 0;
};

export const isValidLineName = async (lineName: string | null): Promise<boolean> => {
  if (!lineName) return true; // null допустим
  const { rows } = await getPool().query<{ count: string }>(
    'SELECT COUNT(*) as count FROM lines WHERE name = $1',
    [lineName]
  );
  return Number.parseInt(rows[0]?.count ?? '0', 10) > 0;
};

export const isValidGrenadeTypeName = async (grenadeTypeName: string): Promise<boolean> => {
  const { rows } = await getPool().query<{ count: string }>(
    'SELECT COUNT(*) as count FROM grenade_types WHERE name = $1',
    [grenadeTypeName]
  );
  return Number.parseInt(rows[0]?.count ?? '0', 10) > 0;
};

// User management functions
export const upsertUser = async (params: {
  telegramId: number;
  username?: string | null;
  firstName: string;
  lastName?: string | null;
  photoUrl?: string | null;
}): Promise<{ telegramId: number; role: 'admin' | 'user' }> => {
  const { rows } = await getPool().query<{ telegram_id: number; role: 'admin' | 'user' }>(
    `
      INSERT INTO users (telegram_id, username, first_name, last_name, photo_url)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (telegram_id) DO UPDATE SET
        username = EXCLUDED.username,
        first_name = EXCLUDED.first_name,
        last_name = EXCLUDED.last_name,
        photo_url = EXCLUDED.photo_url,
        updated_at = NOW()
      RETURNING telegram_id, role
    `,
    [params.telegramId, params.username ?? null, params.firstName, params.lastName ?? null, params.photoUrl ?? null]
  );
  const row = rows[0];
  if (!row) throw new Error('Failed to upsert user');
  return { telegramId: row.telegram_id, role: row.role };
};

export const setUserRole = async (telegramId: number, role: 'admin' | 'user'): Promise<void> => {
  await getPool().query(
    'UPDATE users SET role = $2, updated_at = NOW() WHERE telegram_id = $1',
    [telegramId, role]
  );
};

export const getAllUsers = async (): Promise<UserRecord[]> => {
  const { rows } = await getPool().query<{
    telegram_id: number;
    username: string | null;
    first_name: string;
    last_name: string | null;
    photo_url: string | null;
    role: 'admin' | 'user';
    created_at: string;
  }>(
    'SELECT telegram_id, username, first_name, last_name, photo_url, role, created_at FROM users ORDER BY created_at DESC'
  );
  return rows.map((r) => ({
    telegramId: r.telegram_id,
    username: r.username,
    firstName: r.first_name,
    lastName: r.last_name,
    photoUrl: r.photo_url,
    role: r.role,
    createdAt: r.created_at,
  }));
};

export const getProgressByUser = async (userId: number): Promise<ProgressRecord[]> => {
  const { rows } = await getPool().query<ProgressRecord>(
    'SELECT granade_id, status, updated_at FROM granade_progress WHERE user_id = $1',
    [userId]
  );
  return rows;
};

export const upsertProgress = async (
  userId: number,
  granadeId: number,
  status: ProgressStatus,
): Promise<void> => {
  await getPool().query(
    `
      INSERT INTO granade_progress (user_id, granade_id, status, updated_at)
      VALUES ($1, $2, $3, NOW())
      ON CONFLICT (user_id, granade_id) DO UPDATE SET
        status = EXCLUDED.status,
        updated_at = NOW()
    `,
    [userId, granadeId, status]
  );
};

export const deleteProgress = async (userId: number, granadeId: number): Promise<number> => {
  const { rowCount } = await getPool().query(
    'DELETE FROM granade_progress WHERE user_id = $1 AND granade_id = $2',
    [userId, granadeId]
  );
  return rowCount ?? 0;
};
