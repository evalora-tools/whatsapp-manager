# WhatsApp Manager

Aplicación para gestionar conversaciones de WhatsApp con React, Node.js y Supabase.

## Características

- 🚀 Frontend moderno con React y Tailwind CSS
- 🔐 Autenticación segura con Supabase
- 💬 Gestión centralizada de conversaciones de WhatsApp
- 📱 Diseño responsive y atractivo
- ⚡ Backend API con Node.js y Express

## Instalación

### Prerrequisitos
- Node.js (versión 14 o superior)
- npm o yarn
- Cuenta de Supabase

### Configuración

1. **Instalar dependencias:**
   ```bash
   npm run install-all
   ```

2. **Configurar variables de entorno:**
   
   **Cliente (client/.env):**
   ```
   REACT_APP_SUPABASE_URL=tu_url_de_supabase
   REACT_APP_SUPABASE_ANON_KEY=tu_clave_anonima_de_supabase
   ```
   
   **Servidor (server/.env):**
   ```
   PORT=5000
   SUPABASE_URL=tu_url_de_supabase
   SUPABASE_SERVICE_ROLE_KEY=tu_clave_de_servicio_de_supabase
   ```

3. **Configurar Supabase:**
   - Crea un proyecto en [Supabase](https://supabase.com)
   - Las tablas necesarias ya están definidas en tu base de datos
   - Configura las políticas de Row Level Security según tus necesidades

## Ejecutar la aplicación

### Desarrollo
```bash
# Ejecutar cliente y servidor simultáneamente
npm run dev

# O ejecutar por separado:
npm run client    # Frontend en puerto 3000
npm run server    # Backend en puerto 5000
```

### Producción
```bash
# Construir cliente
cd client && npm run build

# Ejecutar servidor
cd server && npm start
```

## Estructura del proyecto

```
whatsapp-manager/
├── client/                 # Frontend React
│   ├── public/
│   ├── src/
│   │   ├── components/     # Componentes reutilizables
│   │   ├── pages/         # Páginas principales
│   │   ├── supabaseClient.js
│   │   └── App.js
│   └── package.json
├── server/                # Backend Node.js
│   ├── index.js
│   └── package.json
└── package.json          # Scripts principales
```

## Funcionalidades

### Completadas ✅
- [x] Estructura del proyecto
- [x] Frontend React con Tailwind CSS
- [x] Página principal (FrontPage) atractiva
- [x] Sistema de autenticación con Supabase
- [x] Componente de Login/Registro
- [x] Dashboard básico
- [x] Navegación entre páginas

### Próximas funcionalidades 🚧
- [ ] Integración completa con las tablas de la base de datos
- [ ] Visualización de conversaciones de WhatsApp
- [ ] Sistema de respuestas automatizadas
- [ ] Integración con n8n para mensajes automáticos
- [ ] Filtros y búsqueda de conversaciones
- [ ] Notificaciones en tiempo real

## Contribuir

1. Fork el proyecto
2. Crea una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

## Licencia

Este proyecto está bajo la Licencia MIT.