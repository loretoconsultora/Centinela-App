"use client";

import { useEffect } from "react";
import type { ReporteAPI } from "@/lib/types";
import { formatearFecha } from "@/lib/documentos";
import { BotonPdf, ReporteView } from "./ReporteView";
import { EstadoBadge } from "./EstadoBadge";

// Dictamen final de un análisis recién hecho, en ventana con tachita para cerrar.
export function ModalReporte({
  reporte,
  vista,
  onCerrar,
  onVerEnLista,
}: {
  reporte: ReporteAPI;
  vista: string;
  onCerrar: () => void;
  onVerEnLista: () => void;
}) {
  useEffect(() => {
    const tecla = (e: KeyboardEvent) => e.key === "Escape" && onCerrar();
    document.addEventListener("keydown", tecla);
    const previo = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", tecla);
      document.body.style.overflow = previo;
    };
  }, [onCerrar]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/30 px-4 py-8 backdrop-blur-[2px]"
      onMouseDown={(e) => e.target === e.currentTarget && onCerrar()}
      role="dialog"
      aria-modal="true"
    >
      <div className="w-full max-w-4xl rounded-[24px] bg-background p-5 shadow-[var(--shadow-lg)] sm:p-8">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-xs font-medium uppercase tracking-wide text-foreground-muted">
              Resultado de revisión
            </p>
            <h2 className="mt-1 break-words text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
              {reporte.documento}
            </h2>
            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-foreground-muted">
              {reporte.autorNombre && <span>{reporte.autorNombre}</span>}
              <span>{formatearFecha(reporte.fecha)}</span>
              <EstadoBadge dictamen={reporte.dictamen} />
            </div>
          </div>
          <button
            onClick={onCerrar}
            aria-label="Cerrar dictamen"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-border bg-white text-foreground-muted transition hover:text-foreground"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>

        <div className="flex flex-col gap-6">
          <div className="flex flex-wrap items-center gap-3">
            {reporte.documentoId && <BotonPdf documentoId={reporte.documentoId} vista={vista} />}
            {reporte.guardado ? (
              <button
                type="button"
                onClick={onVerEnLista}
                className="text-sm font-medium text-foreground underline underline-offset-2"
              >
                Ver en Gestión de documentos
              </button>
            ) : (
              <p className="rounded-[10px] bg-amarillo/10 px-3 py-2 text-sm text-[#8a6d00]">
                El reporte se generó, pero no pudo guardarse en Gestión de documentos. Avisa a la
                administradora técnica.
              </p>
            )}
          </div>
          <ReporteView reporte={reporte} />
        </div>
      </div>
    </div>
  );
}
