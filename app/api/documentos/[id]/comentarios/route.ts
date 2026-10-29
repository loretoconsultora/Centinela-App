import { NextResponse, type NextRequest } from "next/server";
import { obtenerSesion } from "@/lib/sesion";
import { crearClienteAdmin } from "@/lib/supabase/admin";
import { esRol } from "@/lib/roles";

// Comentarios de un documento (estilo foro). Las autoras los leen (solo en sus
// documentos); solo revisoras de núcleo y administradoras pueden escribir.
async function contexto(request: NextRequest, id: string, vistaPedida: unknown) {
  const sesion = await obtenerSesion();
  if (sesion.estado === "sin_sesion") {
    return { error: NextResponse.json({ error: "No autenticado." }, { status: 401 }) };
  }
  if (sesion.estado === "sin_acceso") {
    return { error: NextResponse.json({ error: "Tu cuenta no tiene acceso activo." }, { status: 403 }) };
  }
  if (!esRol(vistaPedida) || !sesion.perfil.roles.includes(vistaPedida)) {
    return { error: NextResponse.json({ error: "No tienes ese rol." }, { status: 403 }) };
  }
  if (!/^[0-9a-f-]{36}$/i.test(id)) {
    return { error: NextResponse.json({ error: "Documento no encontrado." }, { status: 404 }) };
  }
  const admin = crearClienteAdmin();
  const { data: doc } = await admin
    .from("documentos")
    .select("id, nombre, autor_id")
    .eq("id", id)
    .maybeSingle();
  if (!doc || (vistaPedida === "autora" && doc.autor_id !== sesion.user.id)) {
    return { error: NextResponse.json({ error: "Documento no encontrado." }, { status: 404 }) };
  }
  return { sesion, vista: vistaPedida, admin, doc };
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const c = await contexto(request, id, request.nextUrl.searchParams.get("vista"));
  if ("error" in c && c.error) return c.error;
  const { admin } = c as Exclude<typeof c, { error: NextResponse }>;

  const { data, error } = await admin
    .from("comentarios")
    .select("id, autor_id, autor_nombre, texto, created_at")
    .eq("documento_id", id)
    .order("created_at", { ascending: true });
  if (error) {
    // Sin la tabla (SQL 03 pendiente) el hilo aparece vacío en vez de romper.
    return NextResponse.json([]);
  }
  return NextResponse.json(data);
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json().catch(() => null);
  const c = await contexto(request, id, body?.vista);
  if ("error" in c && c.error) return c.error;
  const { sesion, vista, admin, doc } = c as Exclude<typeof c, { error: NextResponse }>;

  // Solo revisoras y administradoras comentan (y desde una vista que no sea la de autora).
  const puede =
    vista !== "autora" &&
    (sesion.perfil.roles.includes("administradora") || sesion.perfil.roles.includes("revisora_nucleo"));
  if (!puede) {
    return NextResponse.json(
      { error: "Solo las revisoras de núcleo y las administradoras pueden comentar." },
      { status: 403 }
    );
  }

  const texto = typeof body?.texto === "string" ? body.texto.trim() : "";
  if (texto.length < 1 || texto.length > 4000) {
    return NextResponse.json({ error: "Escribe un comentario (máximo 4000 caracteres)." }, { status: 400 });
  }

  const nombre = sesion.perfil.nombre ?? sesion.perfil.email;
  const { data: nuevo, error } = await admin
    .from("comentarios")
    .insert({ documento_id: id, autor_id: sesion.user.id, autor_nombre: nombre, texto })
    .select("id, autor_id, autor_nombre, texto, created_at")
    .single();
  if (error || !nuevo) {
    return NextResponse.json(
      { error: "No se pudo guardar el comentario. ¿Ya se corrió el SQL 03 en Supabase?" },
      { status: 500 }
    );
  }

  // Avisos: a la autora del documento y a las demás revisoras que ya participaron.
  try {
    const { data: previos } = await admin
      .from("comentarios")
      .select("autor_id")
      .eq("documento_id", id);
    const participantes = new Set<string>((previos ?? []).map((p) => p.autor_id));
    participantes.delete(sesion.user.id);
    participantes.delete(doc.autor_id);

    const resumen = texto.length > 90 ? `${texto.slice(0, 90)}…` : texto;
    const mensaje = `${nombre} comentó en «${doc.nombre}»: “${resumen}”`;
    const filas: {
      usuario_id: string;
      documento_id: string;
      vista: "autora" | "revisora_nucleo";
      tipo: "comentario";
      mensaje: string;
    }[] = [];
    if (doc.autor_id !== sesion.user.id) {
      filas.push({ usuario_id: doc.autor_id, documento_id: id, vista: "autora", tipo: "comentario", mensaje });
    }
    for (const uid of participantes) {
      filas.push({ usuario_id: uid, documento_id: id, vista: "revisora_nucleo", tipo: "comentario", mensaje });
    }
    if (filas.length > 0) await admin.from("notificaciones").insert(filas);
  } catch {
    // el comentario ya quedó guardado; el aviso es secundario
  }

  return NextResponse.json(nuevo);
}
