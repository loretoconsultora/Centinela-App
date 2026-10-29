"use client";

import { useEffect, useState } from "react";
import type { Rol } from "@/lib/roles";
import { formatearFecha, type ComentarioItem } from "@/lib/documentos";

// Hilo de comentarios de un documento, estilo foro. Lo escriben las revisoras
// de núcleo y las administradoras; las autoras lo leen.
export function ComentariosDocumento({
  documentoId,
  vista,
  onComentado,
}: {
  documentoId: string;
  vista: Rol;
  onComentado: () => void;
}) {
  const puedeComentar = vista !== "autora";
  const [items, setItems] = useState<ComentarioItem[] | null>(null);
  const [texto, setTexto] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let vigente = true;
    fetch(`/api/documentos/${documentoId}/comentarios?vista=${encodeURIComponent(vista)}`, {
      cache: "no-store",
    })
      .then(async (res) => {
        const data = await res.json();
        if (!vigente) return;
        if (!res.ok) setError(data.error || "No se pudieron cargar los comentarios.");
        else setItems(data);
      })
      .catch(() => vigente && setError("Error de conexión."));
    return () => {
      vigente = false;
    };
  }, [documentoId, vista]);

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    if (!texto.trim() || enviando) return;
    setEnviando(true);
    setError(null);
    try {
      const res = await fetch(`/api/documentos/${documentoId}/comentarios`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vista, texto }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data) {
        setError(data?.error || "No se pudo enviar el comentario.");
        return;
      }
      setItems((prev) => [...(prev ?? []), data as ComentarioItem]);
      setTexto("");
      onComentado();
    } catch {
      setError("Error de conexión.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <section className="card card-lg p-5 sm:p-7">
      <div className="mb-4 flex items-baseline justify-between gap-3">
        <h3 className="text-lg font-semibold tracking-tight text-foreground">
          Comentarios del equipo
        </h3>
        {items && items.length > 0 && (
          <span className="text-sm text-foreground-muted">
            {items.length} {items.length === 1 ? "comentario" : "comentarios"}
          </span>
        )}
      </div>

      {!items && !error && <p className="text-sm text-foreground-muted">Cargando…</p>}

      {items && items.length === 0 && (
        <p className="rounded-[14px] border border-dashed border-border-strong px-4 py-5 text-center text-sm text-foreground-muted">
          {puedeComentar
            ? "Aún no hay comentarios. Escribe el primero para la autora y el equipo."
            : "Aún no hay comentarios. Aquí verás lo que te escriban las revisoras y administradoras."}
        </p>
      )}

      {items && items.length > 0 && (
        <ul className="flex flex-col gap-3">
          {items.map((c) => (
            <li key={c.id} className="rounded-[14px] border border-border bg-surface px-4 py-3">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-ve-azul/10 text-xs font-semibold text-ve-azul">
                  {c.autor_nombre.trim().charAt(0).toUpperCase()}
                </span>
                <span className="text-sm font-medium text-foreground">{c.autor_nombre}</span>
                <span className="text-xs text-foreground-muted">{formatearFecha(c.created_at)}</span>
              </div>
              <p className="mt-2 whitespace-pre-line break-words text-sm leading-relaxed text-foreground">
                {c.texto}
              </p>
            </li>
          ))}
        </ul>
      )}

      {error && <p className="mt-3 rounded-[10px] bg-rojo/5 px-3 py-2 text-sm text-rojo">{error}</p>}

      {puedeComentar ? (
        <form onSubmit={enviar} className="mt-4 flex flex-col gap-3">
          <label htmlFor="comentario" className="sr-only">
            Escribe un comentario
          </label>
          <textarea
            id="comentario"
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            rows={3}
            maxLength={4000}
            placeholder="Escribe un comentario para la autora y el equipo de revisión…"
            className="w-full resize-none rounded-[14px] border border-border px-4 py-3 text-sm outline-none transition focus:border-ve-azul focus:ring-2 focus:ring-ve-azul/20"
          />
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs text-foreground-muted">
              La autora recibe un aviso en la campanita.
            </p>
            <button
              type="submit"
              disabled={!texto.trim() || enviando}
              className="rounded-[10px] bg-foreground px-5 py-2.5 text-sm font-medium text-white transition hover:opacity-85 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {enviando ? "Enviando…" : "Comentar"}
            </button>
          </div>
        </form>
      ) : (
        <p className="mt-4 text-xs text-foreground-muted">
          Solo las revisoras de núcleo y las administradoras pueden comentar.
        </p>
      )}
    </section>
  );
}
