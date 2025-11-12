-- Seed reference tables with initial data
-- This migration should run after 001_init.sql

-- Insert sides
INSERT INTO sides (name, display_name) VALUES
  ('t', 'T (Terrorists)'),
  ('ct', 'CT (Counter-Terrorists)'),
  ('both', 'Both sides')
ON CONFLICT (name) DO NOTHING;

-- Insert difficulties
INSERT INTO difficulties (name, display_name) VALUES
  ('easy', 'Easy'),
  ('medium', 'Medium'),
  ('hard', 'Hard')
ON CONFLICT (name) DO NOTHING;

-- Insert lines
INSERT INTO lines (name, display_name) VALUES
  ('plant_a', 'Plant A'),
  ('plant_b', 'Plant B'),
  ('mid', 'Mid'),
  ('all', 'All lines')
ON CONFLICT (name) DO NOTHING;

-- Insert grenade types
INSERT INTO grenade_types (name, display_name) VALUES
  ('smoke', 'Smoke'),
  ('flash', 'Flash'),
  ('molotov', 'Molotov'),
  ('he', 'HE Grenade'),
  ('all', 'All types')
ON CONFLICT (name) DO NOTHING;

-- Insert maps (from constants)
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
ON CONFLICT (name) DO NOTHING;

