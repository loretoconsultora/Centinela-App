import { NextResponse, type NextRequest } from "next/server";
import { obtenerSesion } from "@/lib/sesion";
import { crearClienteAdmin } from "@/lib/supabase/admin";
import { esRol } from "@/lib/roles";
import { generarPdfReporte, nombreArchivoPdf } from "@/lib/pdf-reporte";
import type { ReporteGuardado } from "@/lib/types";

// Descarga del reporte en PDF. Mismas reglas de acceso que el detalle:
// una autora solo descarga los suyos.
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
    .select("nombre, autor_id, autor_nombre, created_at, reporte")
    .eq("id", id)
    .maybeSingle();
  if (error || !data || (vista === "autora" && data.autor_id !== sesion.user.id)) {
    return NextResponse.json({ error: "Documento no encontrado." }, { status: 404 });
  }

  const pdf = await generarPdfReporte({
    reporte: data.reporte as ReporteGuardado,
    autorNombre: data.autor_nombre,
    creadoEn: data.created_at,
  });

  const nombre = nombreArchivoPdf(data.nombre);
  const ascii = nombre.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^\x20-\x7e]/g, "");
  return new NextResponse(Buffer.from(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(nombre)}`,
      "Cache-Control": "private, no-store",
    },
  });
}
