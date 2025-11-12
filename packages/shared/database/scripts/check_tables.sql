-- Проверка таблиц в базе данных cs2_bot
-- Выполни эти команды в psql после подключения к базе cs2_bot

-- Показать все таблицы
\dt

-- Показать структуру таблицы granades
\d granades

-- Показать структуру таблицы maps
\d maps

-- Проверить, что справочные таблицы заполнены данными
SELECT * FROM sides;
SELECT * FROM difficulties;
SELECT * FROM lines;
SELECT * FROM grenade_types;
SELECT * FROM maps;

-- Проверить количество записей в каждой таблице
SELECT 'sides' as table_name, COUNT(*) as count FROM sides
UNION ALL
SELECT 'difficulties', COUNT(*) FROM difficulties
UNION ALL
SELECT 'lines', COUNT(*) FROM lines
UNION ALL
SELECT 'grenade_types', COUNT(*) FROM grenade_types
UNION ALL
SELECT 'maps', COUNT(*) FROM maps;
