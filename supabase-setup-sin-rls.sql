-- ============================================
-- SCRIPT SIMPLIFICADO SIN RLS (ROW LEVEL SECURITY)
-- Ejecuta este script en: SQL Editor de Supabase
-- ============================================

-- IMPORTANTE: Este script DESACTIVA RLS
-- Todos los usuarios podrán ver todos los datos
-- Úsalo solo para desarrollo/testing

-- 0. CREAR ESTRUCTURA BASE SI NO EXISTE
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.clientes (
    "N ORDEN" bigint NOT NULL,
    "CONTRATO" text,
    "SERVICIO" text,
    "ESTADO" text,
    "FECHA" text,
    "NOMBRE COMPLETO" text NOT NULL,
    "TELEFONO" bigint,
    "TELEFONO FIJO" text,
    "DIRECCION" text,
    "CODIGO POSTAL" bigint,
    "MUNICIPIO" text,
    "ESTADO MENSAJE" text,
    "FECHA ENVIO PLANTILLA" text,
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
    CONSTRAINT clientes_pkey PRIMARY KEY ("N ORDEN")
);

CREATE TABLE IF NOT EXISTS public.conversations (
    id text NOT NULL,
    title text,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
    estado text,
    comentario text,
    gestionada boolean,
    enviar_segunda_plantilla boolean,
    CONSTRAINT conversations_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.messages (
    id text NOT NULL DEFAULT gen_random_uuid()::text,
    conversation_id text REFERENCES public.conversations(id) ON DELETE CASCADE,
    sender_type text NOT NULL DEFAULT 'user'::text CHECK (sender_type = ANY (ARRAY['user'::text, 'Asistente'::text, 'Admin'::text])),
    content text NOT NULL,
    created_at timestamptz DEFAULT now(),
    "Respondido" boolean DEFAULT false,
    CONSTRAINT messages_pkey PRIMARY KEY (id)
);

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
CREATE INDEX IF NOT EXISTS idx_conversations_user_id_id ON public.conversations(user_id, id);
CREATE INDEX IF NOT EXISTS idx_clientes_user_id_nombre_completo ON public.clientes(user_id, "NOMBRE COMPLETO");
CREATE INDEX IF NOT EXISTS idx_clientes_user_id_telefono ON public.clientes(user_id, "TELEFONO");
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON public.messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_conversation_created_at ON public.messages(conversation_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_conversation_respondido ON public.messages(conversation_id, "Respondido");
CREATE INDEX IF NOT EXISTS idx_messages_conversation_sender_type ON public.messages(conversation_id, sender_type);

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