import { NextResponse, type NextRequest } from "next/server";
import { obtenerSesion } from "@/lib/sesion";
import { crearClienteAdmin } from "@/lib/supabase/admin";
import { esRol } from "@/lib/roles";
import { reporteParaVista } from "@/lib/reporte-api";
import type { ReporteGuardado } from "@/lib/types";

// Detalle de un documento: el reporte tal como lo ve la vista pedida.
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const sesion = await obtenerSesion();
  if (sesion.estado === "sin_sesion") {
    return NextResponse.json({ error: "No autenticado." }, { status: 401 });
  }
  if (sesion.estado === "sin_acceso") {
    return NextResponse.json({ error: "Tu cuenta no tiene acceso activo." }, { status: 403 });
  }

  const vista = request.nextUrl.searchParams.get("vista");
  if (!esRol(vista) || !sesion.perfil.roles.includes(vista)) {
    return NextResponse.json({ error: "No tienes ese rol." }, { status: 403 });
  }

  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) {
    return NextResponse.json({ error: "Documento no encontrado." }, { status: 404 });
  }

  const admin = crearClienteAdmin();
  const { data, error } = await admin
    .from("documentos")
    .select("id, nombre, autor_id, autor_nombre, dictamen, created_at, reporte")
    .eq("id", id)
    .maybeSingle();

  // Una autora solo abre los suyos; para el resto es como si no existiera.
  if (error || !data || (vista === "autora" && data.autor_id !== sesion.user.id)) {
    return NextResponse.json({ error: "Documento no encontrado." }, { status: 404 });
  }

  return NextResponse.json({
    documento: {
      id: data.id,
      nombre: data.nombre,
      autor_id: data.autor_id,
      autor_nombre: data.autor_nombre,
      dictamen: data.dictamen,
      created_at: data.created_at,
    },
    reporte: reporteParaVista(data.reporte as ReporteGuardado, vista),
  });
}
