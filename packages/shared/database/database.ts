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
} from '../utils/types';
import type {
  DifficultyKey,
  SideKey,
  LineKey,
  GrenadeTypeKey,
  MapKey,
} from '../config/constants';

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

// Создание структуры базы данных
const createDatabaseStructure = async () => {
  const client = await getPool().connect();

  try {
    await client.query('BEGIN');

    // Проверяем, существует ли хотя бы одна таблица
    const mapsExists = await tableExists('maps');

    if (mapsExists) {
      // Структура уже создана
      await client.query('COMMIT');
      return;
    }

    // Создание справочных таблиц
    await client.query(`
      CREATE TABLE maps (
        id SERIAL PRIMARY KEY,
        name TEXT UNIQUE NOT NULL,
        display_name TEXT NOT NULL
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
  const { rows } = await getPool().query<MapRecord>('SELECT id, name, display_name FROM maps ORDER BY display_name');
  return rows;
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

export const getSmokesByMap = async (mapName: RealMapKey): Promise<SmokeWithMap[]> => {
  const { rows } = await getPool().query<SmokeRowDB>(
    `
      SELECT
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
        g.image_url
      FROM granades g
      JOIN maps m ON g.map_id = m.id
      JOIN difficulties d ON g.difficulty_id = d.id
      JOIN sides si ON g.side_id = si.id
      LEFT JOIN lines l ON g.line_id = l.id
      JOIN grenade_types gt ON g.grenade_type_id = gt.id
      WHERE m.name = $1
      ORDER BY g.name
    `,
    [mapName]
  );

  return rows.map(mapSmokeRowToPublic);
};

export const getAllSmokes = async (): Promise<SmokeWithMap[]> => {
  const { rows } = await getPool().query<SmokeRowDB>(
    `
      SELECT
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
        g.image_url
      FROM granades g
      JOIN maps m ON g.map_id = m.id
      JOIN difficulties d ON g.difficulty_id = d.id
      JOIN sides si ON g.side_id = si.id
      LEFT JOIN lines l ON g.line_id = l.id
      JOIN grenade_types gt ON g.grenade_type_id = gt.id
      ORDER BY m.display_name, g.name
    `
  );

  return rows.map(mapSmokeRowToPublic);
};

export const addSmoke = async (mapName: string, smokeData: NewSmokeInput): Promise<number> => {
  return withTransaction(async (client) => {
    const mapId = await resolveMapId(client, mapName);
    const difficultyId = await resolveDifficultyId(client, smokeData.difficulty);
    const sideId = await resolveSideId(client, smokeData.side);
    const lineId = await resolveLineId(client, smokeData.line);
    const grenadeTypeId = await resolveGrenadeTypeId(client, smokeData.grenadeType ?? 'smoke');

    const insertResult = await client.query<{ id: number }>(
      `
        INSERT INTO granades (map_id, name, display_name, lineup_instructions, image_url, difficulty_id, side_id, line_id, grenade_type_id)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING id
      `,
      [
        mapId,
        smokeData.name,
        null, // display_name can be null
        smokeData.lineup_instructions,
        toNullable(smokeData.imageUrl),
        difficultyId,
        sideId,
        lineId,
        grenadeTypeId,
      ]
    );

    return insertResult.rows[0]?.id ?? 0;
  });
};

export const saveSmokeImage = async (
  smokeId: number,
  fileId: string,
  mediaType: MediaType = 'photo',
  caption: string | null = null
): Promise<number> => {
  const { rows } = await getPool().query<{ id: number }>(
    'INSERT INTO granade_media (granade_id, file_id, media_type, caption) VALUES ($1, $2, $3, $4) RETURNING id',
    [smokeId, fileId, mediaType, caption]
  );

  return rows[0]?.id ?? 0;
};

export const getSmokeMedia = async (smokeId: number): Promise<SmokeMediaRecord[]> => {
  const { rows } = await getPool().query<SmokeMediaRecord>(
    `
      SELECT id, granade_id as smoke_id, file_id, media_type, caption, created_at
      FROM granade_media
      WHERE granade_id = $1
      ORDER BY created_at
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
    `
      SELECT
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
        g.image_url
      FROM granades g
      JOIN maps m ON g.map_id = m.id
      JOIN difficulties d ON g.difficulty_id = d.id
      JOIN sides si ON g.side_id = si.id
      LEFT JOIN lines l ON g.line_id = l.id
      JOIN grenade_types gt ON g.grenade_type_id = gt.id
      WHERE g.id = $1
      LIMIT 1
    `,
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
