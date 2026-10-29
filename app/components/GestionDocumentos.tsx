"use client";

import { useEffect, useMemo, useState } from "react";
import type { Rol } from "@/lib/roles";
import { ROL_LABEL } from "@/lib/roles";
import type { ReporteAPI } from "@/lib/types";
import {
  ESTADOS,
  formatearFecha,
  type DocumentoResumen,
} from "@/lib/documentos";
import { EstadoBadge, ESTILO_ESTADO } from "./EstadoBadge";
import { BotonPdf, ReporteView } from "./ReporteView";

function Inicial({ nombre }: { nombre: string }) {
  return (
    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-ve-azul/10 text-[10px] font-semibold text-ve-azul">
      {nombre.trim().charAt(0).toUpperCase() || "?"}
    </span>
  );
}

function DetalleDocumento({
  id,
  vista,
  onCerrar,
}: {
  id: string;
  vista: Rol;
  onCerrar: () => void;
}) {
  const [datos, setDatos] = useState<{ documento: DocumentoResumen; reporte: ReporteAPI } | null>(
    null
  );
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let vigente = true;
    fetch(`/api/documentos/${id}?vista=${encodeURIComponent(vista)}`)
      .then(async (res) => {
        const data = await res.json();
        if (!vigente) return;
        if (!res.ok) setError(data.error || "No se pudo abrir el documento.");
        else setDatos(data);
      })
      .catch(() => vigente && setError("Error de conexión."));
    return () => {
      vigente = false;
    };
  }, [id, vista]);

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
              {datos?.documento.nombre ?? "Cargando…"}
            </h2>
            {datos && (
              <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-foreground-muted">
                <span className="inline-flex items-center gap-2">
                  <Inicial nombre={datos.documento.autor_nombre} />
                  {datos.documento.autor_nombre}
                </span>
                <span>{formatearFecha(datos.documento.created_at)}</span>
                <EstadoBadge dictamen={datos.documento.dictamen} />
              </div>
            )}
          </div>
          <button
            onClick={onCerrar}
            aria-label="Cerrar"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-border bg-white text-foreground-muted hover:text-foreground transition"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>

        {error && <p className="text-sm text-rojo">{error}</p>}
        {!datos && !error && <p className="text-sm text-foreground-muted">Cargando…</p>}
        {datos && (
          <div className="flex flex-col gap-6">
            <div>
              <BotonPdf documentoId={datos.documento.id} vista={vista} />
            </div>
            <ReporteView reporte={datos.reporte} />
          </div>
        )}
      </div>
    </div>
  );
}

export function GestionDocumentos({
  vista,
  abrirId,
  onAbrirId,
}: {
  vista: Rol;
  /** Documento abierto en el detalle (lo puede fijar una notificación). */
  abrirId: string | null;
  onAbrirId: (id: string | null) => void;
}) {
  const [docs, setDocs] = useState<DocumentoResumen[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busqueda, setBusqueda] = useState("");

  useEffect(() => {
    let vigente = true;
    fetch(`/api/documentos?vista=${encodeURIComponent(vista)}`, { cache: "no-store" })
      .then(async (res) => {
        const data = await res.json();
        if (!vigente) return;
        if (!res.ok) setError(data.error || "No se pudo cargar la lista.");
        else setDocs(data);
      })
      .catch(() => vigente && setError("Error de conexión."));
    return () => {
      vigente = false;
    };
  }, [vista]);

  const filtrados = useMemo(() => {
    if (!docs) return [];
    const q = busqueda.trim().toLowerCase();
    if (!q) return docs;
    return docs.filter(
      (d) => d.nombre.toLowerCase().includes(q) || d.autor_nombre.toLowerCase().includes(q)
    );
  }, [docs, busqueda]);

  const porEstado = useMemo(() => {
    const m = new Map(ESTADOS.map((e) => [e.clave, [] as DocumentoResumen[]]));
    for (const d of filtrados) m.get(d.dictamen)?.push(d);
    return m;
  }, [filtrados]);

  const alcance =
    vista === "autora"
      ? "Tus documentos revisados y el estado de cada uno."
      : "Los documentos revisados del equipo, organizados por estado.";

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
            Gestión de documentos
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-foreground-muted">
            {alcance} Vista de {ROL_LABEL[vista].toLowerCase()}.
          </p>
        </div>
        <input
          type="search"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          placeholder={vista === "autora" ? "Buscar por nombre" : "Buscar por documento o autora"}
          className="w-full rounded-[10px] border border-border bg-white px-4 py-2.5 text-sm outline-none transition focus:border-ve-azul focus:ring-2 focus:ring-ve-azul/20 sm:w-72"
        />
      </div>

      {error && <p className="rounded-[10px] bg-rojo/5 px-3 py-2 text-sm text-rojo">{error}</p>}
      {!docs && !error && <p className="text-sm text-foreground-muted">Cargando…</p>}

      {docs && (
        <>
          {/* Tablero: una columna por estado */}
          <section aria-label="Tablero por estado" className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {ESTADOS.map((est) => {
              const lista = porEstado.get(est.clave) ?? [];
              const s = ESTILO_ESTADO[est.clave];
              return (
                <div key={est.clave} className={`rounded-[20px] border border-border p-3 ${s.columna}`}>
                  <div className="flex items-center justify-between gap-2 px-2 pb-1 pt-1.5">
                    <div className="flex min-w-0 items-center gap-2">
                      <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${s.dot}`} />
                      <h2 className={`truncate text-sm font-semibold ${s.fg}`}>{est.etiqueta}</h2>
                    </div>
                    <span className="rounded-full bg-white px-2 py-0.5 text-xs font-medium text-foreground-muted border border-border">
                      {lista.length}
                    </span>
                  </div>
                  <p className="px-2 pb-3 text-xs text-foreground-muted">{est.descripcion}</p>

                  <div className="flex max-h-[26rem] flex-col gap-2.5 overflow-y-auto pr-0.5">
                    {lista.length === 0 && (
                      <p className="rounded-[14px] border border-dashed border-border-strong px-3 py-6 text-center text-xs text-foreground-muted">
                        Sin documentos
                      </p>
                    )}
                    {lista.map((d) => (
                      <button
                        key={d.id}
                        onClick={() => onAbrirId(d.id)}
                        className={`card border-l-4 ${s.barra} p-3.5 text-left transition hover:shadow-[var(--shadow-md)]`}
                      >
                        <span className="line-clamp-2 break-words text-sm font-medium text-foreground">
                          {d.nombre}
                        </span>
                        <span className="mt-2 flex items-center gap-2 text-xs text-foreground-muted">
                          <Inicial nombre={d.autor_nombre} />
                          <span className="truncate">{d.autor_nombre}</span>
                        </span>
                        <span className="mt-1 block text-xs text-foreground-muted">
                          {formatearFecha(d.created_at)}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </section>

          {/* Listado completo */}
          <section aria-label="Listado de documentos" className="card card-lg p-5 sm:p-7">
            <div className="mb-4 flex items-baseline justify-between gap-3">
              <h2 className="text-lg font-semibold tracking-tight text-foreground">
                Todos los documentos
              </h2>
              <span className="text-sm text-foreground-muted">
                {filtrados.length} {filtrados.length === 1 ? "documento" : "documentos"}
              </span>
            </div>

            {filtrados.length === 0 ? (
              <p className="py-8 text-center text-sm text-foreground-muted">
                {docs.length === 0
                  ? vista === "autora"
                    ? "Aún no has revisado ningún documento. Cuando lo hagas, aparecerá aquí con su estado."
                    : "Aún no hay documentos revisados. Cuando se revise el primero, aparecerá aquí."
                  : "Ningún documento coincide con la búsqueda."}
              </p>
            ) : (
              <>
              {/* Celular: una tarjeta por documento */}
              <ul className="flex flex-col gap-2.5 md:hidden">
                {filtrados.map((d) => (
                  <li key={d.id}>
                    <button
                      onClick={() => onAbrirId(d.id)}
                      className="w-full rounded-[14px] border border-border bg-white p-3.5 text-left transition hover:bg-surface"
                    >
                      <span className="block break-words text-sm font-medium text-foreground">
                        {d.nombre}
                      </span>
                      <span className="mt-2 flex items-center gap-2 text-xs text-foreground-muted">
                        <Inicial nombre={d.autor_nombre} />
                        {d.autor_nombre}
                      </span>
                      <span className="mt-1 block text-xs text-foreground-muted">
                        {formatearFecha(d.created_at)}
                      </span>
                      <span className="mt-2 block">
                        <EstadoBadge dictamen={d.dictamen} />
                      </span>
                    </button>
                  </li>
                ))}
              </ul>

              <div className="-mx-2 hidden overflow-x-auto md:block">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs text-foreground-muted">
                      <th className="px-2 py-2 font-medium">Documento</th>
                      <th className="px-2 py-2 font-medium">Autora</th>
                      <th className="px-2 py-2 font-medium">Fecha</th>
                      <th className="px-2 py-2 font-medium">Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtrados.map((d) => (
                      <tr
                        key={d.id}
                        onClick={() => onAbrirId(d.id)}
                        className="cursor-pointer border-t border-border align-middle transition hover:bg-surface"
                      >
                        <td className="max-w-[22rem] px-2 py-3 font-medium text-foreground">
                          <span className="line-clamp-2 break-words">{d.nombre}</span>
                        </td>
                        <td className="px-2 py-3 text-foreground-muted">
                          <span className="inline-flex items-center gap-2">
                            <Inicial nombre={d.autor_nombre} />
                            {d.autor_nombre}
                          </span>
                        </td>
                        <td className="whitespace-nowrap px-2 py-3 text-foreground-muted">
                          {formatearFecha(d.created_at)}
                        </td>
                        <td className="px-2 py-3">
                          <EstadoBadge dictamen={d.dictamen} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              </>
            )}
          </section>
        </>
      )}

      {abrirId && <DetalleDocumento id={abrirId} vista={vista} onCerrar={() => onAbrirId(null)} />}
    </div>
  );
}
