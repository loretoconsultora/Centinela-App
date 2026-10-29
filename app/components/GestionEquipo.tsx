"use client";

import { useEffect, useState } from "react";
import type { FilaEquipo } from "@/lib/documentos";
import { EquipoPanel } from "./EquipoPanel";

interface Datos {
  filas: FilaEquipo[];
  totales: { total: number; aprobado: number; observaciones: number; bloqueado: number };
  umbral: number;
}

const COL = "px-3 py-3 text-right tabular-nums";

// Gestión del equipo: cuánto ha subido cada autora y cómo quedó, con alarma
// cuando una autora acumula más de 3 documentos bloqueados.
export function GestionEquipo({ esAdmin }: { esAdmin: boolean }) {
  const [datos, setDatos] = useState<Datos | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let vigente = true;
    fetch("/api/gestion-equipo", { cache: "no-store" })
      .then(async (res) => {
        const data = await res.json();
        if (!vigente) return;
        if (!res.ok) setError(data.error || "No se pudo cargar la gestión del equipo.");
        else setDatos(data);
      })
      .catch(() => vigente && setError("Error de conexión."));
    return () => {
      vigente = false;
    };
  }, []);

  const enAlerta = datos?.filas.filter((f) => f.alerta) ?? [];

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
          Gestión del equipo
        </h1>
        <p className="mt-1 max-w-2xl text-sm text-foreground-muted">
          Cuántos documentos ha subido cada autora y cómo quedaron. Con más de {datos?.umbral ?? 3}{" "}
          documentos bloqueados se activa una alarma para revisarlo personalmente.
        </p>
      </div>

      {error && <p className="rounded-[10px] bg-rojo/5 px-3 py-2 text-sm text-rojo">{error}</p>}
      {!datos && !error && <p className="text-sm text-foreground-muted">Cargando…</p>}

      {enAlerta.length > 0 && (
        <div role="alert" className="rounded-[20px] border border-rojo/25 bg-rojo/[0.06] p-5 sm:p-6">
          <p className="text-base font-semibold text-rojo">
            🚨 {enAlerta.length === 1 ? "Una autora supera" : `${enAlerta.length} autoras superan`} los{" "}
            {datos?.umbral} documentos bloqueados: revisar personalmente
          </p>
          <ul className="mt-2 flex flex-col gap-1">
            {enAlerta.map((f) => (
              <li key={f.id} className="text-sm text-foreground">
                <span className="font-medium">{f.nombre}</span>
                <span className="text-foreground-muted">
                  {" "}
                  · {f.bloqueado} bloqueados de {f.total} subidos
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {datos && (
        <section className="card card-lg p-5 sm:p-7">
          <div className="mb-4 flex items-baseline justify-between gap-3">
            <h2 className="text-lg font-semibold tracking-tight text-foreground">
              Documentos por autora
            </h2>
            <span className="text-sm text-foreground-muted">
              {datos.filas.length} {datos.filas.length === 1 ? "autora" : "autoras"}
            </span>
          </div>

          <div className="-mx-2 overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm">
              <thead>
                <tr className="text-xs text-foreground-muted">
                  <th className="px-3 py-2 text-left font-medium">Autora</th>
                  <th className="px-3 py-2 text-right font-medium">Subidos</th>
                  <th className="px-3 py-2 text-right font-medium">Aprobados</th>
                  <th className="px-3 py-2 text-right font-medium">Con observaciones</th>
                  <th className="px-3 py-2 text-right font-medium">Bloqueados</th>
                  <th className="px-3 py-2 text-left font-medium">Alerta</th>
                </tr>
              </thead>
              <tbody>
                {datos.filas.map((f) => (
                  <tr
                    key={f.id}
                    className={`border-t border-border ${f.alerta ? "bg-rojo/[0.05]" : ""}`}
                  >
                    <td className="px-3 py-3">
                      <span className="block font-medium text-foreground">{f.nombre}</span>
                      <span className="block text-xs text-foreground-muted">{f.email}</span>
                    </td>
                    <td className={`${COL} font-medium text-foreground`}>{f.total}</td>
                    <td className={`${COL} ${f.aprobado ? "text-verde" : "text-foreground-muted"}`}>
                      {f.aprobado}
                    </td>
                    <td
                      className={`${COL} ${f.observaciones ? "text-[#8a6d00]" : "text-foreground-muted"}`}
                    >
                      {f.observaciones}
                    </td>
                    <td
                      className={`${COL} ${f.bloqueado ? "font-semibold text-rojo" : "text-foreground-muted"}`}
                    >
                      {f.bloqueado}
                    </td>
                    <td className="px-3 py-3">
                      {f.alerta && (
                        <span className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full bg-rojo/10 px-3 py-1 text-xs font-semibold text-rojo">
                          🚨 Revisar personalmente
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-border-strong bg-surface font-semibold text-foreground">
                  <td className="px-3 py-3">Total del equipo</td>
                  <td className={COL}>{datos.totales.total}</td>
                  <td className={`${COL} text-verde`}>{datos.totales.aprobado}</td>
                  <td className={`${COL} text-[#8a6d00]`}>{datos.totales.observaciones}</td>
                  <td className={`${COL} text-rojo`}>{datos.totales.bloqueado}</td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>
        </section>
      )}

      {esAdmin && <EquipoPanel />}
    </div>
  );
}
