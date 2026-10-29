import { NextResponse } from "next/server";
import { obtenerSesion } from "@/lib/sesion";
import { crearClienteAdmin } from "@/lib/supabase/admin";

// Autoras disponibles para subir un documento a su nombre. Solo para quien
// tenga rol de revisora de núcleo o administradora.
export async function GET() {
  const sesion = await obtenerSesion();
  if (sesion.estado === "sin_sesion") {
    return NextResponse.json({ error: "No autenticado." }, { status: 401 });
  }
  if (
    sesion.estado === "sin_acceso" ||
    !(sesion.perfil.roles.includes("administradora") || sesion.perfil.roles.includes("revisora_nucleo"))
  ) {
    return NextResponse.json({ error: "Sin permiso." }, { status: 403 });
  }

  const admin = crearClienteAdmin();
  const { data, error } = await admin
    .from("profiles")
    .select("id, nombre, email")
    .eq("activo", true)
    .contains("roles", ["autora"])
    .order("nombre", { ascending: true });
  if (error) {
    return NextResponse.json({ error: "No se pudo leer la lista de autoras." }, { status: 500 });
  }
  return NextResponse.json(
    (data ?? []).map((p) => ({ id: p.id, nombre: p.nombre ?? p.email, email: p.email }))
  );
}
