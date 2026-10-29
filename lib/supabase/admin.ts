import "server-only";
import { createClient } from "@supabase/supabase-js";

// Cliente con la clave SECRETA: se salta todas las reglas de seguridad (RLS).
// Solo se usa en rutas de servidor, después de verificar quién es la usuaria.
// Nunca importar desde código del navegador (server-only lo impide).
export function crearClienteAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const clave = process.env.SUPABASE_SECRET_KEY;
  if (!url || !clave) {
    throw new Error("Falta SUPABASE_SECRET_KEY o NEXT_PUBLIC_SUPABASE_URL en Vercel.");
  }
  return createClient(url, clave, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
