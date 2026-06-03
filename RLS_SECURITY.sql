-- 1. Добавляем поле для фото
ALTER TABLE it_assets ADD COLUMN IF NOT EXISTS photo_url TEXT;
ALTER TABLE it_assets ADD COLUMN IF NOT EXISTS photos JSONB DEFAULT '[]'::jsonb;
ALTER TABLE equipment_assets ADD COLUMN IF NOT EXISTS photo_url TEXT;
ALTER TABLE equipment_assets ADD COLUMN IF NOT EXISTS photos JSONB DEFAULT '[]'::jsonb;

-- 2. Создаём bucket в Supabase Storage (через Dashboard):
-- Название: 'equipment-photos'
-- Public: true

-- 3. Очищаем конфликтующие RLS политики
DROP POLICY IF EXISTS "Authenticated users can view own location assets" ON it_assets;
DROP POLICY IF EXISTS "Only admins can create it_assets" ON it_assets;
DROP POLICY IF EXISTS "Only admins can delete assets" ON it_assets;
DROP POLICY IF EXISTS "Only admins can delete it_assets" ON it_assets;
DROP POLICY IF EXISTS "Only admins can modify assets" ON it_assets;
DROP POLICY IF EXISTS "Only admins to update assets" ON it_assets;
DROP POLICY IF EXISTS "Only admins to update it_assets" ON it_assets;
DROP POLICY IF EXISTS "Users can read all assets" ON it_assets;

CREATE POLICY "it_assets_select" ON it_assets
FOR SELECT TO authenticated USING (true);

CREATE POLICY "it_assets_insert" ON it_assets
FOR INSERT TO authenticated WITH CHECK (auth.email() = 'admin@inventory.app');

CREATE POLICY "it_assets_update" ON it_assets
FOR UPDATE TO authenticated USING (auth.email() = 'admin@inventory.app');

CREATE POLICY "it_assets_delete" ON it_assets
FOR DELETE TO authenticated USING (auth.email() = 'admin@inventory.app');

-- Проверка
SELECT policyname, roles FROM pg_policies WHERE tablename = 'it_assets';