"use client";

import { useEffect, useState } from "react";

const ETAPAS = [
  "Leyendo el documento…",
  "Evaluando el Eje A: calidad pedagógica…",
  "Evaluando el Eje B: coherencia con los programas oficiales…",
  "Revisando los criterios eliminatorios…",
  "Redactando el dictamen y las recomendaciones…",
];

// Barra de progreso "viva" mientras corre el análisis. No mide el avance real
// (el análisis no lo reporta): solo muestra que la revisión sigue en marcha.
export function ProgresoAnalisis() {
  const [seg, setSeg] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setSeg((s) => s + 1), 1000);
    // Avisa si se intenta cerrar o recargar la pestaña a mitad del análisis.
    const aviso = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", aviso);
    return () => {
      clearInterval(t);
      window.removeEventListener("beforeunload", aviso);
    };
  }, []);

  const etapa = ETAPAS[Math.min(Math.floor(seg / 20), ETAPAS.length - 1)];
  const mm = Math.floor(seg / 60);
  const ss = String(seg % 60).padStart(2, "0");

  return (
    <div role="status" aria-live="polite" className="card card-lg flex flex-col gap-4 p-6 sm:p-8">
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-base font-semibold tracking-tight text-foreground">
          Analizando el documento
        </p>
        <span className="text-sm tabular-nums text-foreground-muted">
          {mm}:{ss}
        </span>
      </div>

      <div className="relative h-2 w-full overflow-hidden rounded-full bg-surface">
        <div className="progreso-indeterminado absolute inset-y-0 w-1/3 rounded-full bg-ve-azul" />
      </div>

      <p className="text-sm text-foreground">{etapa}</p>
      <p className="text-xs leading-relaxed text-foreground-muted">
        Esto puede tardar varios minutos, según el tamaño del documento. Mientras la barra se esté
        moviendo, la revisión sigue en marcha. No cierres ni recargues esta página y no vuelvas a
        enviar el documento: se cobraría el análisis dos veces.
      </p>
    </div>
  );
}
