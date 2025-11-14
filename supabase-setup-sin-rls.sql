-- ============================================
-- SCRIPT SIMPLIFICADO SIN RLS (ROW LEVEL SECURITY)
-- Ejecuta este script en: SQL Editor de Supabase
-- ============================================

-- IMPORTANTE: Este script DESACTIVA RLS
-- Todos los usuarios podrán ver todos los datos
-- Úsalo solo para desarrollo/testing

-- 1. DESACTIVAR ROW LEVEL SECURITY
ALTER TABLE public.conversations DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.clientes DISABLE ROW LEVEL SECURITY;

-- 2. ELIMINAR TODAS LAS POLÍTICAS EXISTENTES
DROP POLICY IF EXISTS "Users can view their own conversations" ON public.conversations;
DROP POLICY IF EXISTS "Users can insert their own conversations" ON public.conversations;
DROP POLICY IF EXISTS "Users can update their own conversations" ON public.conversations;
DROP POLICY IF EXISTS "Users can delete their own conversations" ON public.conversations;

DROP POLICY IF EXISTS "Users can view messages from their conversations" ON public.messages;
DROP POLICY IF EXISTS "Users can insert messages to their conversations" ON public.messages;
DROP POLICY IF EXISTS "Users can update messages in their conversations" ON public.messages;
DROP POLICY IF EXISTS "Users can delete messages from their conversations" ON public.messages;

DROP POLICY IF EXISTS "Users can view their own clients" ON public.clientes;
DROP POLICY IF EXISTS "Users can insert their own clients" ON public.clientes;
DROP POLICY IF EXISTS "Users can update their own clients" ON public.clientes;
DROP POLICY IF EXISTS "Users can delete their own clients" ON public.clientes;

-- 3. AGREGAR COLUMNAS user_id SI NO EXISTEN
ALTER TABLE public.conversations 
ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.clientes 
ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;

-- 4. CREAR ÍNDICES PARA MEJOR RENDIMIENTO
CREATE INDEX IF NOT EXISTS idx_conversations_user_id ON public.conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_clientes_user_id ON public.clientes(user_id);

-- 5. FUNCIÓN PARA ACTUALIZAR TIMESTAMP AUTOMÁTICAMENTE
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 6. TRIGGER PARA ACTUALIZAR updated_at
DROP TRIGGER IF EXISTS update_conversations_updated_at ON public.conversations;
CREATE TRIGGER update_conversations_updated_at
    BEFORE UPDATE ON public.conversations
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- ¡LISTO! Base de datos configurada SIN RLS
-- ============================================

-- NOTA: Sin RLS, la aplicación debe filtrar los datos por user_id manualmente
-- Esto ya está implementado en el código React

-- Para verificar:
SELECT 
    tablename, 
    rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('conversations', 'messages', 'clientes');
-- Debería mostrar 'f' (false) en rowsecurity para todas las tablas