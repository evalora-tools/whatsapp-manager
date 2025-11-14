# 🔐 Configuración de Supabase - Guía Completa

## 📋 Pasos para Configurar Supabase

### 1️⃣ Crear Proyecto en Supabase

1. Ve a [https://supabase.com](https://supabase.com)
2. Haz clic en "Start your project"
3. Inicia sesión con tu cuenta (GitHub, Google, etc.)
4. Crea un nuevo proyecto:
   - **Name**: WhatsApp Manager (o el nombre que prefieras)
   - **Database Password**: Guarda esta contraseña en un lugar seguro
   - **Region**: Selecciona la más cercana a ti
   - Haz clic en "Create new project"

⏱️ _Espera 2-3 minutos mientras Supabase crea tu proyecto_

---

### 2️⃣ Obtener las Credenciales

1. Una vez creado el proyecto, ve a **Settings** (⚙️) → **API**
2. Copia las siguientes credenciales:

   - **Project URL**: `https://xxxxxxxx.supabase.co`
   - **anon/public key**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`
   - **service_role key**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` (¡secreta!)

3. Pega estas credenciales en tus archivos `.env`:

**En `client/.env`:**
```env
REACT_APP_SUPABASE_URL=https://xxxxxxxx.supabase.co
REACT_APP_SUPABASE_ANON_KEY=tu_clave_anon_aqui
```

**En `server/.env`:**
```env
PORT=5000
SUPABASE_URL=https://xxxxxxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=tu_clave_service_role_aqui
```

---

### 3️⃣ Ejecutar el Script SQL

1. En Supabase, ve al **SQL Editor** (icono </> en el menú lateral)
2. Haz clic en "+ New query"
3. Copia TODO el contenido del archivo `supabase-setup.sql`
4. Pégalo en el editor
5. Haz clic en "Run" (▶️) o presiona `Ctrl+Enter`

✅ Verás un mensaje de "Success" cuando termine

---

### 4️⃣ Verificar la Configuración

#### Verificar Tablas:
1. Ve a **Table Editor** en el menú lateral
2. Deberías ver las siguientes tablas:
   - ✅ `conversations` (con columna `user_id`)
   - ✅ `messages`
   - ✅ `clientes` (con columna `user_id`)

#### Verificar Políticas RLS:
1. En **Table Editor**, selecciona la tabla `conversations`
2. Haz clic en el ícono de escudo (🛡️) o ve a la pestaña "Policies"
3. Deberías ver 4 políticas:
   - ✅ "Users can view their own conversations"
   - ✅ "Users can insert their own conversations"
   - ✅ "Users can update their own conversations"
   - ✅ "Users can delete their own conversations"

---

### 5️⃣ Habilitar Autenticación por Email

1. Ve a **Authentication** → **Providers**
2. Busca "Email" en la lista
3. Asegúrate de que esté **ENABLED** (habilitado)
4. Configuración recomendada:
   - ✅ **Enable email confirmations**: ON (los usuarios confirman su email)
   - ✅ **Secure email change**: ON
   - ✅ **Enable email signup**: ON

---

## 🔒 ¿Qué hace el Script SQL?

El script `supabase-setup.sql` hace lo siguiente:

### 1. Agrega columnas `user_id`
- Añade `user_id` a `conversations` y `clientes`
- Crea una relación con la tabla de usuarios (`auth.users`)

### 2. Habilita Row Level Security (RLS)
- Activa RLS en todas las tablas
- **RLS = Cada usuario solo ve sus propios datos**

### 3. Crea políticas de seguridad
- **SELECT**: Ver solo datos propios
- **INSERT**: Crear solo datos propios
- **UPDATE**: Modificar solo datos propios
- **DELETE**: Eliminar solo datos propios

### 4. Configuración automática
- Triggers para actualizar `updated_at` automáticamente
- Índices para mejorar el rendimiento

---

## 🧪 Probar la Configuración

### Crear un usuario de prueba:

1. En tu aplicación, ve a `/login`
2. Haz clic en "Regístrate"
3. Ingresa:
   - Email: `test@example.com`
   - Contraseña: `Test123!`
4. Revisa tu email para confirmar la cuenta

### Verificar en Supabase:

1. Ve a **Authentication** → **Users**
2. Deberías ver tu usuario registrado
3. Copia el `UUID` del usuario

### Crear datos de prueba:

```sql
-- Ve al SQL Editor y ejecuta:
INSERT INTO conversations (id, title, user_id)
VALUES (
  gen_random_uuid()::text,
  'Conversación de prueba',
  'aqui-va-el-uuid-de-tu-usuario'
);
```

---

## ❓ Problemas Comunes

### "Invalid API key"
- ✅ Verifica que copiaste bien las claves
- ✅ Asegúrate de que no haya espacios antes/después
- ✅ Reinicia el servidor después de crear `.env`

### "Row Level Security policy violation"
- ✅ Verifica que ejecutaste el script SQL completo
- ✅ Asegúrate de estar autenticado antes de hacer consultas
- ✅ Verifica que `user_id` coincida con el usuario autenticado

### "relation does not exist"
- ✅ Verifica que la tabla existe en **Table Editor**
- ✅ Ejecuta el script SQL completo de nuevo

---

## 📚 Recursos Adicionales

- [Documentación de Supabase](https://supabase.com/docs)
- [Row Level Security](https://supabase.com/docs/guides/auth/row-level-security)
- [Autenticación](https://supabase.com/docs/guides/auth)

---

## ✨ ¡Listo!

Tu aplicación ahora está configurada para:
- ✅ Registrar usuarios
- ✅ Iniciar sesión
- ✅ Ver solo las conversaciones propias
- ✅ Gestionar clientes por usuario
- ✅ Seguridad completa con RLS

**Siguiente paso**: Ejecuta `npm run dev` y prueba tu aplicación! 🚀