-- Удаление всех таблиц из базы данных cs2_bot
-- ⚠️ ВНИМАНИЕ: Это удалит ВСЕ данные!

-- Удаляем таблицы с зависимостями сначала
DROP TABLE IF EXISTS granade_media CASCADE;
DROP TABLE IF EXISTS granades CASCADE;

-- Удаляем справочные таблицы
DROP TABLE IF EXISTS grenade_types CASCADE;
DROP TABLE IF EXISTS lines CASCADE;
DROP TABLE IF EXISTS difficulties CASCADE;
DROP TABLE IF EXISTS sides CASCADE;
DROP TABLE IF EXISTS maps CASCADE;

-- Проверка: показать оставшиеся таблицы (должно быть пусто)
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public';

