import { NextResponse } from "next/server";
import { obtenerSesion } from "@/lib/sesion";
import { crearClienteAdmin } from "@/lib/supabase/admin";
import { UMBRAL_BLOQUEADOS, type FilaEquipo } from "@/lib/documentos";

// Gestión del equipo: por autora, cuántos documentos ha subido y cómo
// quedaron. Solo para revisoras de núcleo y administradoras.
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
  const { data: autoras, error: e1 } = await admin
    .from("profiles")
    .select("id, nombre, email")
    .eq("activo", true)
    .contains("roles", ["autora"]);
  const { data: docs, error: e2 } = await admin
    .from("documentos")
    .select("autor_id, dictamen");
  if (e1 || e2) {
    return NextResponse.json(
      { error: "No se pudo leer el equipo. ¿Ya se corrió el SQL 02 en Supabase?" },
      { status: 500 }
    );
  }

  const filas = new Map<string, FilaEquipo>();
  for (const a of autoras ?? []) {
    filas.set(a.id, {
      id: a.id,
      nombre: a.nombre ?? a.email,
      email: a.email,
      total: 0,
      aprobado: 0,
      observaciones: 0,
      bloqueado: 0,
      alerta: false,
    });
  }
  for (const d of docs ?? []) {
    const f = filas.get(d.autor_id);
    if (!f) continue;
    f.total++;
    if (d.dictamen === "aprobado") f.aprobado++;
    else if (d.dictamen === "aprobado_con_observaciones") f.observaciones++;
    else if (d.dictamen === "bloqueado") f.bloqueado++;
  }
  const lista = [...filas.values()];
  for (const f of lista) f.alerta = f.bloqueado > UMBRAL_BLOQUEADOS;
  // Primero quienes tienen alarma; luego por orden alfabético.
  lista.sort((a, b) => Number(b.alerta) - Number(a.alerta) || a.nombre.localeCompare(b.nombre, "es"));

  const totales = lista.reduce(
    (t, f) => ({
      total: t.total + f.total,
      aprobado: t.aprobado + f.aprobado,
      observaciones: t.observaciones + f.observaciones,
      bloqueado: t.bloqueado + f.bloqueado,
    }),
    { total: 0, aprobado: 0, observaciones: 0, bloqueado: 0 }
  );

  return NextResponse.json({ filas: lista, totales, umbral: UMBRAL_BLOQUEADOS });
}
