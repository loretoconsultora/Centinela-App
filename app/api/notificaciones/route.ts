import { NextResponse, type NextRequest } from "next/server";
import { obtenerSesion } from "@/lib/sesion";
import { crearClienteAdmin } from "@/lib/supabase/admin";

// Campanita: las últimas notificaciones de la persona y cuántas no ha leído.
export async function GET() {
  const sesion = await obtenerSesion();
  if (sesion.estado === "sin_sesion") {
    return NextResponse.json({ error: "No autenticado." }, { status: 401 });
  }
  if (sesion.estado === "sin_acceso") {
    return NextResponse.json({ error: "Tu cuenta no tiene acceso activo." }, { status: 403 });
  }

  const admin = crearClienteAdmin();
  const { data, error } = await admin
    .from("notificaciones")
    .select("id, documento_id, vista, tipo, mensaje, leida, created_at")
    .eq("usuario_id", sesion.user.id)
    .order("created_at", { ascending: false })
    .limit(30);
  if (error) {
    // Sin tabla (SQL 02 pendiente) la campanita queda vacía, sin romper la app.
    return NextResponse.json({ items: [], sinLeer: 0 });
  }

  const { count } = await admin
    .from("notificaciones")
    .select("id", { count: "exact", head: true })
    .eq("usuario_id", sesion.user.id)
    .eq("leida", false);

  return NextResponse.json({ items: data, sinLeer: count ?? 0 });
}

// Marca como leída una notificación ({ id }) o todas (sin id).
export async function POST(request: NextRequest) {
  const sesion = await obtenerSesion();
  if (sesion.estado === "sin_sesion") {
    return NextResponse.json({ error: "No autenticado." }, { status: 401 });
  }
  if (sesion.estado === "sin_acceso") {
    return NextResponse.json({ error: "Tu cuenta no tiene acceso activo." }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));
  const id = typeof body?.id === "string" ? body.id : null;

  const admin = crearClienteAdmin();
  let consulta = admin
    .from("notificaciones")
    .update({ leida: true })
    .eq("usuario_id", sesion.user.id)
    .eq("leida", false);
  if (id) consulta = consulta.eq("id", id);
  const { error } = await consulta;
  if (error) {
    return NextResponse.json({ error: "No se pudo actualizar." }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
