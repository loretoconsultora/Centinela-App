import "server-only";
import type { User } from "@supabase/supabase-js";
import { crearClienteServidor } from "./supabase/server";
import { esRol, type PerfilPublico, type Rol } from "./roles";

export type Sesion =
  | { estado: "sin_sesion" }
  | { estado: "sin_acceso"; user: User }
  | { estado: "ok"; user: User; perfil: PerfilPublico };

/**
 * Verifica contra Supabase quién hace la petición y qué perfil tiene.
 * Es la única fuente de verdad para permisos en las rutas de API.
 */
export async function obtenerSesion(): Promise<Sesion> {
  const supabase = await crearClienteServidor();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return { estado: "sin_sesion" };
  const user = data.user;

  const { data: fila } = await supabase
    .from("profiles")
    .select("email, nombre, nucleo, roles, activo, debe_cambiar_password")
    .eq("id", user.id)
    .maybeSingle();

  const roles: Rol[] = ((fila?.roles as unknown[]) ?? []).filter(esRol);
  if (!fila || !fila.activo || roles.length === 0) {
    return { estado: "sin_acceso", user };
  }

  return {
    estado: "ok",
    user,
    perfil: {
      email: fila.email,
      nombre: fila.nombre,
      nucleo: fila.nucleo,
      roles,
      debe_cambiar_password: !!fila.debe_cambiar_password,
    },
  };
}
