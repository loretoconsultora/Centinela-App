import "server-only";
import type { Sesion } from "./sesion";
import type { Rol } from "./roles";
import { crearClienteAdmin } from "./supabase/admin";
import { ETIQUETA_ESTADO } from "./documentos";
import type { ReporteGuardado } from "./types";

type SesionOk = Extract<Sesion, { estado: "ok" }>;

export interface Autor {
  id: string;
  nombre: string;
}

/**
 * Dueña del documento. En la vista de Autora siempre es quien lo sube.
 * Revisoras y administradoras pueden subirlo a nombre de otra autora activa.
 * Devuelve null si la autora pedida no existe o no tiene rol de autora.
 */
export async function resolverAutor(
  sesion: SesionOk,
  vista: Rol,
  autorPedido: string | null
): Promise<Autor | null> {
  const yo: Autor = { id: sesion.user.id, nombre: sesion.perfil.nombre ?? sesion.perfil.email };
  if (vista === "autora" || !autorPedido || autorPedido === yo.id) return yo;
  const admin = crearClienteAdmin();
  const { data: autora } = await admin
    .from("profiles")
    .select("id, nombre, email, roles, activo")
    .eq("id", autorPedido)
    .maybeSingle();
  if (!autora || !autora.activo || !(autora.roles as string[]).includes("autora")) return null;
  return { id: autora.id, nombre: autora.nombre ?? autora.email };
}

interface Entrada {
  sesion: SesionOk;
  autor: Autor;
  reporte: ReporteGuardado;
  uso: { entrada: number; salida: number };
}

interface Resultado {
  guardado: boolean;
  documentoId?: string;
  autorNombre?: string;
}

/**
 * Guarda la revisión en `documentos` y crea las notificaciones de la
 * campanita cuando el dictamen es Bloqueado o Aprobado con observaciones.
 * Nunca lanza: si algo falla, devuelve guardado=false para no perder el reporte.
 */
export async function guardarDocumento(e: Entrada): Promise<Resultado> {
  try {
    const admin = crearClienteAdmin();

    const autorId = e.autor.id;
    const autorNombre = e.autor.nombre;

    const { data: doc, error } = await admin
      .from("documentos")
      .insert({
        nombre: e.reporte.documento,
        autor_id: autorId,
        autor_nombre: autorNombre,
        subido_por: e.sesion.user.id,
        dictamen: e.reporte.dictamen,
        reporte: e.reporte,
        tokens_entrada: e.uso.entrada,
        tokens_salida: e.uso.salida,
      })
      .select("id")
      .single();
    if (error || !doc) return { guardado: false };

    if (e.reporte.dictamen !== "aprobado") {
      const estado = ETIQUETA_ESTADO[e.reporte.dictamen];
      const { data: revisoras } = await admin
        .from("profiles")
        .select("id")
        .eq("activo", true)
        .contains("roles", ["revisora_nucleo"]);

      const aviso = (
        usuario: string,
        vista: "autora" | "revisora_nucleo",
        mensaje: string
      ) => ({
        usuario_id: usuario,
        documento_id: doc.id,
        vista,
        tipo: e.reporte.dictamen,
        mensaje,
      });

      const filas: ReturnType<typeof aviso>[] = [];
      const yo = e.sesion.user.id;
      // A la autora (si no es quien lo subió, que ya ve el resultado en pantalla).
      if (autorId !== yo) {
        filas.push(
          aviso(autorId, "autora", `Tu documento «${e.reporte.documento}» quedó: ${estado}.`)
        );
      }
      // A las revisoras de núcleo, sin repetir a la autora ni a quien lo subió.
      for (const r of revisoras ?? []) {
        if (r.id === yo || r.id === autorId) continue;
        filas.push(
          aviso(
            r.id,
            "revisora_nucleo",
            `«${e.reporte.documento}» de ${autorNombre} quedó: ${estado}.`
          )
        );
      }
      if (filas.length > 0) await admin.from("notificaciones").insert(filas);
    }

    return { guardado: true, documentoId: doc.id, autorNombre };
  } catch {
    return { guardado: false };
  }
}
