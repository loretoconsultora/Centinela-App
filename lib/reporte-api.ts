import { construirReporte } from "./rubric";
import type { Rol } from "./roles";
import type { CriterioReporte, EjeReporte, ReporteAPI, ReporteGuardado } from "./types";

type EjeConstruido = ReturnType<typeof construirReporte>["ejeA"];

function aEje(eje: EjeConstruido): EjeReporte {
  const criterios: CriterioReporte[] = eje.criterios.map((c) => ({
    id: c.id,
    numero: c.numero,
    nombre: c.nombre,
    peso: c.peso,
    puntaje: c.puntaje,
    color: c.color,
    eliminatorio: c.eliminatorio,
    justificacion: c.justificacion,
    citaTextual: c.citaTextual,
  }));
  return { promedio: eje.promedio, color: eje.color, criterios };
}

const NOMBRE_ELIMINATORIO = {
  E1: "la alineación con la visión y los valores de VTG (Eje A, criterio 1)",
  E2: "la distancia del Currículo Nacional Bolivariano de 2007 (Eje B)",
  E3: "la distancia del Currículo Básico Nacional de 1997 (Eje B)",
} as const;

function lista(items: string[]): string {
  if (items.length <= 1) return items.join("");
  return `${items.slice(0, -1).join(", ")} y ${items[items.length - 1]}`;
}

/** "Por qué quedó así": se arma con los datos, no con el modelo. */
export function explicarDictamen(r: ReturnType<typeof construirReporte>): string {
  const a = r.ejeA;
  const b = r.ejeB;
  const resumenEjes = `Eje A: ${a.promedio.toFixed(2)} (${a.color}). Eje B: ${b.promedio.toFixed(2)} (${b.color}).`;

  if (r.dictamen === "bloqueado") {
    const motivos: string[] = r.eliminatoriosDisparados.map(
      (e) => `${e} en rojo: ${NOMBRE_ELIMINATORIO[e]}`
    );
    if (a.color === "rojo") motivos.push("el promedio del Eje A quedó en rojo");
    if (b.color === "rojo") motivos.push("el promedio del Eje B quedó en rojo");
    const moderado =
      a.color !== "rojo" && b.color !== "rojo"
        ? " Aunque los promedios se vean moderados, un criterio eliminatorio en rojo bloquea el documento sin importar el resto: por eso no basta con mirar el promedio."
        : "";
    return `Quedó bloqueado porque ${lista(motivos)}.${moderado} ${resumenEjes}`;
  }
  if (r.dictamen === "aprobado_con_observaciones") {
    const ejes = [a.color === "amarillo" ? "Eje A" : "", b.color === "amarillo" ? "Eje B" : ""].filter(Boolean);
    return `Ningún criterio eliminatorio quedó en rojo, pero ${lista(ejes)} quedó en amarillo: se puede continuar atendiendo las observaciones. ${resumenEjes}`;
  }
  return `Ningún criterio eliminatorio quedó en rojo y ambos ejes están en verde. ${resumenEjes}`;
}

/** Reporte completo (con justificaciones y citas), listo para guardarse. */
export function armarReporteGuardado(
  reporte: ReturnType<typeof construirReporte>,
  documento: string,
  fecha: string,
  narrativa: { hallazgoPrincipal: string; recomendacion: string },
  advertenciaExtraccion?: string
): ReporteGuardado {
  return {
    documento,
    fecha,
    dictamen: reporte.dictamen,
    eliminatoriosDisparados: reporte.eliminatoriosDisparados,
    ejeA: aEje(reporte.ejeA),
    ejeB: aEje(reporte.ejeB),
    explicacionDictamen: explicarDictamen(reporte),
    hallazgoPrincipal: narrativa.hallazgoPrincipal,
    recomendacion: narrativa.recomendacion,
    advertenciaExtraccion,
  };
}

/**
 * Lo que ve cada vista. Desde el taller del 29/oct/2026 la Autora ve el mismo
 * detalle que las revisoras (puntaje, justificación y cita de cada criterio de
 * ambos ejes, más la recomendación); lo que cambia por rol es qué documentos
 * puede abrir: la Autora, solo los suyos.
 */
export function reporteParaVista(guardado: ReporteGuardado, vista: Rol): ReporteAPI {
  return { ...guardado, vista };
}
