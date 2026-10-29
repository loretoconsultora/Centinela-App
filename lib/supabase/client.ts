import { createBrowserClient } from "@supabase/ssr";

// Cliente para el navegador (login, cerrar sesión). Se crea bajo demanda y no
// al importar el archivo, para que el build no falle si faltan las variables.
export function crearClienteNavegador() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const clave = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !clave) {
    throw new Error(
      "Faltan NEXT_PUBLIC_SUPABASE_URL o NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY en Vercel."
    );
  }
  return createBrowserClient(url, clave);
}
