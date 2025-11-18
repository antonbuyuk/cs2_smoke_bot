-- Миграция: добавление колонки sort_order в таблицу granade_media
-- Выполните этот скрипт, если колонка sort_order отсутствует

-- Проверяем существование колонки перед добавлением
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'granade_media'
        AND column_name = 'sort_order'
    ) THEN
        ALTER TABLE granade_media
        ADD COLUMN sort_order INTEGER DEFAULT 0;

        RAISE NOTICE 'Column sort_order added to granade_media table';
    ELSE
        RAISE NOTICE 'Column sort_order already exists in granade_media table';
    END IF;
END $$;

