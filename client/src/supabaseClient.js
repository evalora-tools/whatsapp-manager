import { createClient } from '@supabase/supabase-js';

const supabaseUrl     = process.env.REACT_APP_SUPABASE_URL;
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error(
    '[supabaseClient] Faltan las variables de entorno de Supabase. ' +
    'Asegúrate de que REACT_APP_SUPABASE_URL y REACT_APP_SUPABASE_ANON_KEY estén definidas en tu .env'
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    // Persiste la sesión en localStorage para evitar re-auth innecesarios
    persistSession: true,
    // Detecta cambios de sesión en otras pestañas
    detectSessionInUrl: true,
    // Refresca el token automáticamente antes de que expire
    autoRefreshToken: true,
  },
  global: {
    headers: {
      // Identifica las requests del cliente en los logs de Supabase
      'x-client-info': 'whatsapp-manager-web',
    },
  },
  // Reduce el número de reintentos automáticos para no saturar en caso de error
  // El default es indefinido (reintenta siempre), aquí lo limitamos
  realtime: {
    params: {
      eventsPerSecond: 2,
    },
  },
});