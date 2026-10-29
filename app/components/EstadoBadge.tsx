import type { Dictamen } from "@/lib/rubric";
import { ETIQUETA_ESTADO } from "@/lib/documentos";

export const ESTILO_ESTADO: Record<
  Dictamen,
  { bg: string; fg: string; dot: string; barra: string; columna: string }
> = {
  bloqueado: {
    bg: "bg-rojo/10",
    fg: "text-rojo",
    dot: "bg-rojo",
    barra: "border-l-rojo",
    columna: "bg-rojo/[0.04]",
  },
  aprobado_con_observaciones: {
    bg: "bg-amarillo/20",
    fg: "text-[#8a6d00]",
    dot: "bg-amarillo",
    barra: "border-l-amarillo",
    columna: "bg-amarillo/[0.07]",
  },
  aprobado: {
    bg: "bg-verde/10",
    fg: "text-verde",
    dot: "bg-verde",
    barra: "border-l-verde",
    columna: "bg-verde/[0.04]",
  },
};

export function EstadoBadge({ dictamen }: { dictamen: Dictamen }) {
  const s = ESTILO_ESTADO[dictamen];
  return (
    <span
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-1 text-xs font-medium ${s.bg} ${s.fg}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} />
      {ETIQUETA_ESTADO[dictamen]}
    </span>
  );
}
