-- ============================================
-- CREAR USUARIOS DE PRUEBA EN SUPABASE
-- Ejecuta en: SQL Editor de Supabase
-- ============================================

-- MÉTODO 1: Crear usuario de prueba (más simple)
-- Nota: Este usuario estará auto-confirmado y listo para usar

-- Usuario 1: admin@test.com / Test123!
INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  raw_app_meta_data,
  raw_user_meta_data,
  is_super_admin,
  confirmation_token
) VALUES (
  '00000000-0000-0000-0000-000000000000',
  gen_random_uuid(),
  'authenticated',
  'authenticated',
  'admin@test.com',
  crypt('Test123!', gen_salt('bf')),
  NOW(),
  NOW(),
  NOW(),
  '{"provider":"email","providers":["email"]}',
  '{}',
  false,
  ''
) ON CONFLICT (email) DO NOTHING;

-- Usuario 2: user@test.com / Test123!
INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  raw_app_meta_data,
  raw_user_meta_data,
  is_super_admin,
  confirmation_token
) VALUES (
  '00000000-0000-0000-0000-000000000000',
  gen_random_uuid(),
  'authenticated',
  'authenticated',
  'user@test.com',
  crypt('Test123!', gen_salt('bf')),
  NOW(),
  NOW(),
  NOW(),
  '{"provider":"email","providers":["email"]}',
  '{}',
  false,
  ''
) ON CONFLICT (email) DO NOTHING;

-- ============================================
-- VERIFICAR USUARIOS CREADOS
-- ============================================

-- Ver todos los usuarios
SELECT id, email, email_confirmed_at, created_at 
FROM auth.users 
ORDER BY created_at DESC;

-- ============================================
-- OPCIONAL: CREAR DATOS DE PRUEBA
-- ============================================

-- Crear una conversación de prueba para el primer usuario
-- (Reemplaza 'ID_DEL_USUARIO' con el UUID que obtuviste arriba)

-- Ejemplo:
/*
INSERT INTO public.conversations (id, title, user_id)
VALUES (
  gen_random_uuid()::text,
  'Conversación de Prueba',
  'ID_DEL_USUARIO_AQUI'
);
*/

-- ============================================
-- CREDENCIALES DE PRUEBA:
-- ============================================
-- Email: admin@test.com
-- Password: Test123!
--
-- Email: user@test.com  
-- Password: Test123!
-- ============================================