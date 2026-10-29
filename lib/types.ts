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
}

export interface ErrorAPI {
  error: string;
}
