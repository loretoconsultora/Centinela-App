import type { Dictamen } from "./rubric";

export interface DocumentoResumen {
  id: string;
  nombre: string;
  autor_id: string;
  autor_nombre: string;
  dictamen: Dictamen;
  created_at: string;
}

export interface NotificacionItem {
  id: string;
  documento_id: string | null;
  vista: "autora" | "revisora_nucleo";
  tipo: "bloqueado" | "aprobado_con_observaciones";
  mensaje: string;
  leida: boolean;
  created_at: string;
}

export interface AutoraOpcion {
  id: string;
  nombre: string;
  email: string;
}

// Orden de las columnas del tablero: lo más urgente primero.
export const ESTADOS: { clave: Dictamen; etiqueta: string; descripcion: string }[] = [
  { clave: "bloqueado", etiqueta: "Bloqueado", descripcion: "Requiere revisión de núcleo" },
  {
    clave: "aprobado_con_observaciones",
    etiqueta: "Aprobado con observaciones",
    descripcion: "Se puede continuar, con ajustes",
  },
  { clave: "aprobado", etiqueta: "Aprobado", descripcion: "Listo para el equipo" },
];

export const ETIQUETA_ESTADO: Record<Dictamen, string> = {
  bloqueado: "Bloqueado",
  aprobado_con_observaciones: "Aprobado con observaciones",
  aprobado: "Aprobado",
};

export function esDictamen(v: unknown): v is Dictamen {
  return v === "bloqueado" || v === "aprobado_con_observaciones" || v === "aprobado";
}

/** Fecha y hora en horario de Venezuela, formato corto. */
export function formatearFecha(iso: string): string {
  return new Date(iso).toLocaleString("es-VE", {
    timeZone: "America/Caracas",
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function hace(iso: string): string {
  const seg = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 1000));
  if (seg < 60) return "ahora";
  const min = Math.round(seg / 60);
  if (min < 60) return `hace ${min} min`;
  const h = Math.round(min / 60);
  if (h < 24) return `hace ${h} h`;
  const d = Math.round(h / 24);
  return `hace ${d} ${d === 1 ? "día" : "días"}`;
}
