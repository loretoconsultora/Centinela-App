import type { Dictamen, Eliminatorio, ColorBand } from "./rubric";
import type { Rol } from "./roles";

export interface CriterioReporte {
  id: string;
  numero: number;
  nombre: string;
  peso: number;
  puntaje: number;
  color: ColorBand;
  eliminatorio?: Eliminatorio;
  justificacion: string;
  citaTextual: string;
}

export interface EjeReporte {
  promedio: number;
  color: ColorBand;
  criterios: CriterioReporte[];
}

export interface ReporteAPI {
  documento: string;
  // Vista con la que se corrió el análisis (la verifica el servidor contra
  // los roles reales de la usuaria).
  vista: Rol;
  fecha: string;
  dictamen: Dictamen;
  eliminatoriosDisparados: Eliminatorio[];
  ejeA: EjeReporte;
  // En la vista de Autora el Eje B llega simplificado: solo puntaje y color
  // por criterio, sin justificaciones ni citas político-ideológicas.
  ejeB: EjeReporte;
  advertenciaExtraccion?: string;
  // Textos para la autora. Opcionales por si algún registro viejo no los trae.
  explicacionDictamen?: string;
  hallazgoPrincipal?: string;
  recomendacion?: string;
  // Datos del registro en "Gestión de documentos" (solo al correr una revisión).
  documentoId?: string;
  autorNombre?: string;
  guardado?: boolean;
}

// Reporte tal como se guarda: siempre completo; se simplifica al servirlo.
export type ReporteGuardado = Omit<ReporteAPI, "vista" | "documentoId" | "autorNombre" | "guardado">;

export interface ErrorAPI {
  error: string;
}
