"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { hace, type NotificacionItem } from "@/lib/documentos";

// Campanita de la barra superior. Consulta cada rato si hay avisos nuevos
// (documentos bloqueados u aprobados con observaciones).
export function NotificacionesBell({
  onAbrir,
}: {
  onAbrir: (n: NotificacionItem) => void;
}) {
  const [items, setItems] = useState<NotificacionItem[]>([]);
  const [sinLeer, setSinLeer] = useState(0);
  const [abierto, setAbierto] = useState(false);
  const caja = useRef<HTMLDivElement>(null);

  const cargar = useCallback(async () => {
    try {
      const res = await fetch("/api/notificaciones", { cache: "no-store" });
      if (!res.ok) return;
      const data = await res.json();
      setItems(data.items ?? []);
      setSinLeer(data.sinLeer ?? 0);
    } catch {
      // sin conexión: se reintenta en el siguiente ciclo
    }
  }, []);

  useEffect(() => {
    const t0 = setTimeout(cargar, 0);
    const t = setInterval(cargar, 40000);
    const alVolver = () => document.visibilityState === "visible" && cargar();
    document.addEventListener("visibilitychange", alVolver);
    return () => {
      clearTimeout(t0);
      clearInterval(t);
      document.removeEventListener("visibilitychange", alVolver);
    };
  }, [cargar]);

  useEffect(() => {
    if (!abierto) return;
    const fuera = (e: MouseEvent) => {
      if (caja.current && !caja.current.contains(e.target as Node)) setAbierto(false);
    };
    const tecla = (e: KeyboardEvent) => e.key === "Escape" && setAbierto(false);
    document.addEventListener("mousedown", fuera);
    document.addEventListener("keydown", tecla);
    return () => {
      document.removeEventListener("mousedown", fuera);
      document.removeEventListener("keydown", tecla);
    };
  }, [abierto]);

  async function marcar(id?: string) {
    await fetch("/api/notificaciones", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(id ? { id } : {}),
    }).catch(() => {});
    cargar();
  }

  function abrir(n: NotificacionItem) {
    setAbierto(false);
    if (!n.leida) marcar(n.id);
    onAbrir(n);
  }

  return (
    <div className="relative" ref={caja}>
      <button
        onClick={() => {
          setAbierto((v) => !v);
          if (!abierto) cargar();
        }}
        aria-label={sinLeer > 0 ? `Notificaciones: ${sinLeer} sin leer` : "Notificaciones"}
        aria-expanded={abierto}
        className="relative flex h-10 w-10 items-center justify-center rounded-full border border-border bg-surface text-foreground-muted hover:text-foreground transition"
      >
        <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M6 8a6 6 0 1112 0c0 7 3 9 3 9H3s3-2 3-9" />
          <path d="M10.3 21a1.94 1.94 0 003.4 0" />
        </svg>
        {sinLeer > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-rojo px-1 text-[10px] font-semibold text-white ring-2 ring-white">
            {sinLeer > 99 ? "99+" : sinLeer}
          </span>
        )}
      </button>

      {abierto && (
        <div className="absolute right-0 top-full z-50 mt-2 w-[22rem] max-w-[calc(100vw-2rem)] card card-lg overflow-hidden">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <p className="text-sm font-semibold text-foreground">Notificaciones</p>
            {sinLeer > 0 && (
              <button
                onClick={() => marcar()}
                className="text-xs text-foreground-muted hover:text-foreground transition"
              >
                Marcar todo como leído
              </button>
            )}
          </div>
          <div className="max-h-[24rem] overflow-y-auto">
            {items.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-foreground-muted">
                No hay avisos por ahora. Aquí aparecerán los documentos bloqueados o con
                observaciones.
              </p>
            ) : (
              items.map((n) => (
                <button
                  key={n.id}
                  onClick={() => abrir(n)}
                  className={`flex w-full items-start gap-3 border-b border-border px-4 py-3 text-left transition last:border-b-0 hover:bg-surface ${
                    n.leida ? "" : "bg-surface/60"
                  }`}
                >
                  <span
                    className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${
                      n.tipo === "bloqueado" ? "bg-rojo" : "bg-amarillo"
                    }`}
                  />
                  <span className="min-w-0 flex-1">
                    <span
                      className={`block text-sm leading-snug [overflow-wrap:anywhere] ${
                        n.leida ? "text-foreground-muted" : "font-medium text-foreground"
                      }`}
                    >
                      {n.mensaje}
                    </span>
                    <span className="mt-0.5 block text-xs text-foreground-muted">
                      {hace(n.created_at)}
                    </span>
                  </span>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
