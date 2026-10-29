import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

// Cliente de servidor que actúa COMO la usuaria que hace la petición:
// las reglas de seguridad (RLS) de Supabase se le aplican.
export async function crearClienteServidor() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Desde un componente de servidor no se pueden escribir cookies;
            // proxy.ts ya refresca la sesión, así que se ignora.
          }
        },
      },
    }
  );
}
