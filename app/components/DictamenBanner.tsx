import type { Dictamen, Eliminatorio } from "@/lib/rubric";
import { DICTAMEN_LABEL } from "@/lib/rubric";

const ESTILOS: Record<Dictamen, { bg: string; border: string; fg: string }> = {
  bloqueado: { bg: "bg-rojo/[0.06]", border: "border-rojo/20", fg: "text-rojo" },
  aprobado_con_observaciones: {
    bg: "bg-amarillo/[0.10]",
    border: "border-amarillo/30",
    fg: "text-[#8a6d00]",
  },
  aprobado: { bg: "bg-verde/[0.06]", border: "border-verde/20", fg: "text-verde" },
};

const SUBTEXTO: Record<Dictamen, string> = {
  bloqueado:
    "Queda retenido hasta que una Revisora de núcleo lo revise. No es solo informativo.",
  aprobado_con_observaciones:
    "Queda disponible, pero con las observaciones visibles para revisarlas cuando puedas.",
  aprobado: "El documento queda disponible para el equipo sin trámite adicional.",
};

const ELIM_LABEL: Record<Eliminatorio, string> = {
  E1: "E1 — Alineación con la visión y los valores de VTG",
  E2: "E2 — Distancia del Currículo Nacional Bolivariano (2007)",
  E3: "E3 — Distancia del Currículo Básico Nacional (1997)",
};

export function DictamenBanner({
  dictamen,
  eliminatoriosDisparados,
}: {
  dictamen: Dictamen;
  eliminatoriosDisparados: Eliminatorio[];
}) {
  const s = ESTILOS[dictamen];
  return (
    <div className={`card-lg p-6 sm:p-8 border ${s.border} ${s.bg}`}>
      <p className="text-xs font-medium uppercase tracking-wide text-foreground-muted mb-2">
        Dictamen final
      </p>
      <h2 className={`text-2xl sm:text-3xl font-semibold tracking-tight ${s.fg}`}>
        {DICTAMEN_LABEL[dictamen]}
      </h2>
      <p className="mt-2 text-sm text-foreground-muted max-w-2xl">{SUBTEXTO[dictamen]}</p>

      {eliminatoriosDisparados.length > 0 && (
        <div className="mt-4 flex flex-col gap-1.5">
          <p className="text-xs font-medium text-foreground-muted">Eliminatorio(s) disparado(s):</p>
          <ul className="flex flex-col gap-1">
            {eliminatoriosDisparados.map((e) => (
              <li key={e} className={`text-sm font-medium ${s.fg}`}>
                ⛔ {ELIM_LABEL[e]}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
