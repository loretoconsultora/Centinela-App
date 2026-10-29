import { NextResponse, type NextRequest } from "next/server";
import { obtenerSesion } from "@/lib/sesion";
import { crearClienteAdmin } from "@/lib/supabase/admin";
import { esRol } from "@/lib/roles";

// Listado de "Gestión de documentos".
//  - Vista Autora: solo sus propios documentos.
//  - Vista Revisora de núcleo / Administradora: los de todas.
// La vista pedida solo se concede si la persona tiene de verdad ese rol.
export async function GET(request: NextRequest) {
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

  const admin = crearClienteAdmin();
  let consulta = admin
    .from("documentos")
    .select("id, nombre, autor_id, autor_nombre, dictamen, created_at")
    .order("created_at", { ascending: false })
    .limit(500);
  if (vista === "autora") consulta = consulta.eq("autor_id", sesion.user.id);

  const { data, error } = await consulta;
  if (error) {
    return NextResponse.json(
      { error: "No se pudo leer Gestión de documentos. ¿Ya se corrió el SQL 02 en Supabase?" },
      { status: 500 }
    );
  }

  // Cantidad de comentarios por documento (si la tabla aún no existe, se omite).
  const ids = data.map((d) => d.id);
  const cuentas = new Map<string, number>();
  if (ids.length > 0) {
    const { data: coms } = await admin
      .from("comentarios")
      .select("documento_id")
      .in("documento_id", ids);
    for (const c of coms ?? []) {
      cuentas.set(c.documento_id, (cuentas.get(c.documento_id) ?? 0) + 1);
    }
  }
  return NextResponse.json(data.map((d) => ({ ...d, comentarios: cuentas.get(d.id) ?? 0 })));
}
