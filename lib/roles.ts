// Roles de Centinela. Coinciden con el check de public.profiles.roles en
// Supabase (01_schema.sql). Una persona puede tener varios y alternar entre
// las vistas de cada uno; los permisos reales se verifican siempre en el
// servidor, nunca por lo que diga el navegador.

export type Rol = "administradora" | "revisora_nucleo" | "autora";

export const ROLES: Rol[] = ["autora", "revisora_nucleo", "administradora"];

export const ROL_LABEL: Record<Rol, string> = {
  autora: "Autora",
  revisora_nucleo: "Revisora de núcleo",
  administradora: "Administradora",
};

export function esRol(valor: unknown): valor is Rol {
  return typeof valor === "string" && (ROLES as string[]).includes(valor);
}

/** La vista de Autora recibe el reporte simplificado; las demás, el completo. */
export function vistaVeDetalleCompleto(vista: Rol): boolean {
  return vista !== "autora";
}

export interface PerfilPublico {
  email: string;
  nombre: string | null;
  nucleo: string | null;
  roles: Rol[];
  debe_cambiar_password: boolean;
}

export interface PerfilEquipo extends PerfilPublico {
  activo: boolean;
}
