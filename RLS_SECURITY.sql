-- Row Level Security (RLS) для UCG Inventory
-- Выполни эти SQL-запросы в Supabase SQL Editor

-- ========== PROFILES TABLE ==========
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Пользователь видит только свой профиль
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

-- Админ видит все профили
CREATE POLICY "Admin can view all profiles" ON profiles
  FOR SELECT USING (
    auth.email() = 'admin@inventory.app'
  );

-- Пользователь может обновлять свой профиль
CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

-- Админ может обновлять любой профиль
CREATE POLICY "Admin can update any profile" ON profiles
  FOR UPDATE USING (auth.email() = 'admin@inventory.app');

-- ========== LOCATIONS TABLE ==========
ALTER TABLE locations ENABLE ROW LEVEL SECURITY;

-- Все аутентифицированные пользователи могут читать локации
CREATE POLICY "Authenticated users can view locations" ON locations
  FOR SELECT USING (auth.role() = 'authenticated');

-- Только админы могут создавать локации
CREATE POLICY "Only admins can create locations" ON locations
  FOR INSERT WITH CHECK (auth.email() = 'admin@inventory.app');

-- Только админы могут обновлять локации
CREATE POLICY "Only admins can update locations" ON locations
  FOR UPDATE USING (auth.email() = 'admin@inventory.app');

-- Только админы могут удалять локации
CREATE POLICY "Only admins can delete locations" ON locations
  FOR DELETE USING (auth.email() = 'admin@inventory.app');

-- ========== IT_ASSETS TABLE ==========
ALTER TABLE it_assets ENABLE ROW LEVEL SECURITY;

-- Удаляем все конфликтующие политики для it_assets
DROP POLICY IF EXISTS "Authenticated users can view own location assets" ON it_assets;
DROP POLICY IF EXISTS "Only admins can create it_assets" ON it_assets;
DROP POLICY IF EXISTS "Only admins can delete it_assets" ON it_assets;
DROP POLICY IF EXISTS "Only admins to update it_assets" ON it_assets;
DROP POLICY IF EXISTS "Only admins to modify assets" ON it_assets;
DROP POLICY IF EXISTS "Only admins to update assets" ON it_assets;
DROP POLICY IF EXISTS "Users can read all assets" ON it_assets;

-- Создаем одну политику для чтения
CREATE POLICY "it_assets_read_all" ON it_assets
FOR SELECT TO authenticated
USING (true);

-- Создаем политики для админа
CREATE POLICY "it_assets_admin_insert" ON it_assets
FOR INSERT TO authenticated
WITH CHECK (auth.email() = 'admin@inventory.app');

CREATE POLICY "it_assets_admin_update" ON it_assets
FOR UPDATE TO authenticated
USING (auth.email() = 'admin@inventory.app');

CREATE POLICY "it_assets_admin_delete" ON it_assets
FOR DELETE TO authenticated
USING (auth.email() = 'admin@inventory.app');

-- ========== EQUIPMENT_ASSETS TABLE ==========
ALTER TABLE equipment_assets ENABLE ROW LEVEL SECURITY;

-- Все аутентифицированные пользователи могут читать записи своего location
CREATE POLICY "Authenticated users can view own location equipment" ON equipment_assets
  FOR SELECT USING (
    auth.role() = 'authenticated'
  );

-- Только админы могут создавать оборудование
CREATE POLICY "Only admins can create equipment_assets" ON equipment_assets
  FOR INSERT WITH CHECK (auth.email() = 'admin@inventory.app');

-- Только админы могут обновлять оборудование
CREATE POLICY "Only admins can update equipment_assets" ON equipment_assets
  FOR UPDATE USING (auth.email() = 'admin@inventory.app');

-- Только админы могут удалять оборудование
CREATE POLICY "Only admins can delete equipment_assets" ON equipment_assets
  FOR DELETE USING (auth.email() = 'admin@inventory.app');
