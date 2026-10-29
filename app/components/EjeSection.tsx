import type { EjeReporte } from "@/lib/types";
import { ColorBadge } from "./ColorBadge";

export function EjeSection({
  titulo,
  subtitulo,
  eje,
}: {
  titulo: string;
  subtitulo: string;
  eje: EjeReporte;
}) {
  return (
    <section className="card card-lg p-6 sm:p-8">
      <div className="flex items-start justify-between gap-4 mb-5">
        <div>
          <h3 className="text-lg font-semibold tracking-tight text-foreground">{titulo}</h3>
          <p className="text-sm text-foreground-muted mt-0.5">{subtitulo}</p>
        </div>
        <div className="flex flex-col items-end gap-1 shrink-0">
          <span className="text-2xl font-semibold tracking-tight text-foreground">
            {eje.promedio.toFixed(2)}
          </span>
          <ColorBadge color={eje.color} />
        </div>
      </div>

      <div className="flex flex-col gap-3">
        {eje.criterios.map((c) => (
          <div
            key={c.id}
            className="rounded-[14px] border border-border bg-surface px-4 py-3.5"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground flex items-center gap-1.5 flex-wrap">
                  {c.eliminatorio && (
                    <span className="text-rojo text-xs font-semibold">⛔ {c.eliminatorio}</span>
                  )}
                  {c.nombre}
                  <span className="text-foreground-muted font-normal">· {Math.round(c.peso * 100)}%</span>
                </p>
                {c.justificacion && (
                  <p className="text-sm text-foreground-muted mt-1.5">{c.justificacion}</p>
                )}
                {c.citaTextual && (
                  <blockquote className="mt-2 text-sm italic text-foreground-muted border-l-2 border-border-strong pl-3">
                    “{c.citaTextual}”
                  </blockquote>
                )}
              </div>
              <ColorBadge color={c.color} puntaje={c.puntaje} />
            </div>
          </div>
        ))}
      </div>

    </section>
  );
}
