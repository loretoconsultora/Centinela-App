import type { ColorBand } from "@/lib/rubric";

const ESTILOS: Record<ColorBand, { bg: string; fg: string; dot: string; label: string }> = {
  rojo: { bg: "bg-rojo/10", fg: "text-rojo", dot: "bg-rojo", label: "Rojo" },
  amarillo: {
    bg: "bg-amarillo/15",
    fg: "text-[#8a6d00]",
    dot: "bg-amarillo",
    label: "Amarillo",
  },
  verde: { bg: "bg-verde/10", fg: "text-verde", dot: "bg-verde", label: "Verde" },
};

export function ColorBadge({
  color,
  puntaje,
}: {
  color: ColorBand;
  puntaje?: number;
}) {
  const s = ESTILOS[color];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${s.bg} ${s.fg}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} />
      {typeof puntaje === "number" ? puntaje.toFixed(1) : s.label}
    </span>
  );
}
