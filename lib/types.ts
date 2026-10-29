import type { Dictamen, Eliminatorio, ColorBand, Rol } from "./rubric";

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
  rol: Rol;
  fecha: string;
  dictamen: Dictamen;
  eliminatoriosDisparados: Eliminatorio[];
  ejeA: EjeReporte;
  // ejeB viene completo solo si rol === "nucleo"; para "autora" se omiten
  // las señales de alerta y citas político-ideológicas sensibles del detalle,
  // dejando solo el puntaje y color por criterio.
  ejeB: EjeReporte;
  advertenciaExtraccion?: string;
}

export interface ErrorAPI {
  error: string;
}
