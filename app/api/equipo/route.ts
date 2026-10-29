import { NextResponse } from "next/server";
import { obtenerSesion } from "@/lib/sesion";
import { crearClienteServidor } from "@/lib/supabase/server";

// Lista del equipo para la vista de Administradora. Solo la ve quien tenga
// ese rol (verificado aquí y, además, por las reglas RLS de Supabase).
export async function GET() {
  const sesion = await obtenerSesion();
  if (sesion.estado === "sin_sesion") {
    return NextResponse.json({ error: "No autenticado." }, { status: 401 });
  }
  if (sesion.estado === "sin_acceso" || !sesion.perfil.roles.includes("administradora")) {
    return NextResponse.json({ error: "Sin permiso." }, { status: 403 });
  }

  const supabase = await crearClienteServidor();
  const { data, error } = await supabase
    .from("profiles")
    .select("email, nombre, nucleo, roles, activo, debe_cambiar_password")
    .order("nombre", { ascending: true });

  if (error) {
    return NextResponse.json({ error: "No se pudo leer el equipo." }, { status: 500 });
  }
  return NextResponse.json(data);
}
