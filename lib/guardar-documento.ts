import "server-only";
import type { Sesion } from "./sesion";
import type { Rol } from "./roles";
import { crearClienteAdmin } from "./supabase/admin";
import { ETIQUETA_ESTADO, UMBRAL_BLOQUEADOS } from "./documentos";
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

    // Alarma automática: más de 3 documentos bloqueados acumulados por la misma
    // autora → aviso 🚨 a todas las revisoras para revisarlo personalmente.
    if (e.reporte.dictamen === "bloqueado") {
      const { count } = await admin
        .from("documentos")
        .select("id", { count: "exact", head: true })
        .eq("autor_id", autorId)
        .eq("dictamen", "bloqueado");
      if ((count ?? 0) > UMBRAL_BLOQUEADOS) {
        const { data: revisoras } = await admin
          .from("profiles")
          .select("id")
          .eq("activo", true)
          .contains("roles", ["revisora_nucleo"]);
        const alertas = (revisoras ?? []).map((r) => ({
          usuario_id: r.id,
          documento_id: doc.id,
          vista: "revisora_nucleo" as const,
          tipo: "alerta_bloqueados" as const,
          mensaje: `🚨 ${autorNombre} acumula ${count} documentos bloqueados: revisar personalmente.`,
        }));
        if (alertas.length > 0) await admin.from("notificaciones").insert(alertas);
      }
    }

    return { guardado: true, documentoId: doc.id, autorNombre };
  } catch {
    return { guardado: false };
  }
}
