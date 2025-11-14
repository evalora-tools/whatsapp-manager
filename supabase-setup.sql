-- ============================================
-- SCRIPT PARA CONFIGURAR SUPABASE
-- Ejecuta este script en: SQL Editor de Supabase
-- ============================================

-- 1. MODIFICAR TABLA CONVERSATIONS
-- Agregar columna user_id para asociar conversaciones con usuarios
ALTER TABLE public.conversations 
ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;

-- Crear índice para mejorar rendimiento
CREATE INDEX IF NOT EXISTS idx_conversations_user_id ON public.conversations(user_id);

-- 2. MODIFICAR TABLA CLIENTES
-- Agregar columna user_id para asociar clientes con usuarios
ALTER TABLE public.clientes 
ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;

-- Crear índice para mejorar rendimiento
CREATE INDEX IF NOT EXISTS idx_clientes_user_id ON public.clientes(user_id);

-- 3. HABILITAR ROW LEVEL SECURITY (RLS)
-- Esto asegura que cada usuario solo vea sus propios datos

-- Habilitar RLS en todas las tablas
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clientes ENABLE ROW LEVEL SECURITY;

-- 4. POLÍTICAS PARA TABLA CONVERSATIONS
-- Eliminar políticas existentes si las hay
DROP POLICY IF EXISTS "Users can view their own conversations" ON public.conversations;
DROP POLICY IF EXISTS "Users can insert their own conversations" ON public.conversations;
DROP POLICY IF EXISTS "Users can update their own conversations" ON public.conversations;
DROP POLICY IF EXISTS "Users can delete their own conversations" ON public.conversations;

-- Crear nuevas políticas
-- Ver conversaciones propias
CREATE POLICY "Users can view their own conversations"
ON public.conversations FOR SELECT
USING (auth.uid() = user_id);

-- Insertar conversaciones propias
CREATE POLICY "Users can insert their own conversations"
ON public.conversations FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Actualizar conversaciones propias
CREATE POLICY "Users can update their own conversations"
ON public.conversations FOR UPDATE
USING (auth.uid() = user_id);

-- Eliminar conversaciones propias
CREATE POLICY "Users can delete their own conversations"
ON public.conversations FOR DELETE
USING (auth.uid() = user_id);

-- 5. POLÍTICAS PARA TABLA MESSAGES
-- Eliminar políticas existentes
DROP POLICY IF EXISTS "Users can view messages from their conversations" ON public.messages;
DROP POLICY IF EXISTS "Users can insert messages to their conversations" ON public.messages;
DROP POLICY IF EXISTS "Users can update messages in their conversations" ON public.messages;
DROP POLICY IF EXISTS "Users can delete messages from their conversations" ON public.messages;

-- Crear nuevas políticas
-- Ver mensajes de conversaciones propias
CREATE POLICY "Users can view messages from their conversations"
ON public.messages FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.conversations
    WHERE conversations.id = messages.conversation_id
    AND conversations.user_id = auth.uid()
  )
);

-- Insertar mensajes en conversaciones propias
CREATE POLICY "Users can insert messages to their conversations"
ON public.messages FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.conversations
    WHERE conversations.id = messages.conversation_id
    AND conversations.user_id = auth.uid()
  )
);

-- Actualizar mensajes en conversaciones propias
CREATE POLICY "Users can update messages in their conversations"
ON public.messages FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.conversations
    WHERE conversations.id = messages.conversation_id
    AND conversations.user_id = auth.uid()
  )
);

-- Eliminar mensajes de conversaciones propias
CREATE POLICY "Users can delete messages from their conversations"
ON public.messages FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.conversations
    WHERE conversations.id = messages.conversation_id
    AND conversations.user_id = auth.uid()
  )
);

-- 6. POLÍTICAS PARA TABLA CLIENTES
-- Eliminar políticas existentes
DROP POLICY IF EXISTS "Users can view their own clients" ON public.clientes;
DROP POLICY IF EXISTS "Users can insert their own clients" ON public.clientes;
DROP POLICY IF EXISTS "Users can update their own clients" ON public.clientes;
DROP POLICY IF EXISTS "Users can delete their own clients" ON public.clientes;

-- Crear nuevas políticas
-- Ver clientes propios
CREATE POLICY "Users can view their own clients"
ON public.clientes FOR SELECT
USING (auth.uid() = user_id);

-- Insertar clientes propios
CREATE POLICY "Users can insert their own clients"
ON public.clientes FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Actualizar clientes propios
CREATE POLICY "Users can update their own clients"
ON public.clientes FOR UPDATE
USING (auth.uid() = user_id);

-- Eliminar clientes propios
CREATE POLICY "Users can delete their own clients"
ON public.clientes FOR DELETE
USING (auth.uid() = user_id);

-- 7. FUNCIÓN PARA ACTUALIZAR TIMESTAMP AUTOMÁTICAMENTE
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Crear trigger para actualizar updated_at en conversations
DROP TRIGGER IF EXISTS update_conversations_updated_at ON public.conversations;
CREATE TRIGGER update_conversations_updated_at
    BEFORE UPDATE ON public.conversations
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- ¡LISTO! Tu base de datos está configurada
-- ============================================

-- Para verificar que todo funciona:
-- SELECT * FROM auth.users; -- Ver usuarios registrados
-- SELECT * FROM public.conversations; -- Solo verás tus conversaciones