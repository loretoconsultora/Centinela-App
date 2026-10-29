"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Logo } from "@/app/components/Logo";
import { EquipoPanel } from "@/app/components/EquipoPanel";
import { GestionDocumentos } from "@/app/components/GestionDocumentos";
import { NotificacionesBell } from "@/app/components/NotificacionesBell";
import { BotonPdf, ReporteView } from "@/app/components/ReporteView";
import type { AutoraOpcion, NotificacionItem } from "@/lib/documentos";
import { formatearFecha } from "@/lib/documentos";
import { ROLES, ROL_LABEL, esRol, type PerfilPublico, type Rol } from "@/lib/roles";
import type { ReporteAPI } from "@/lib/types";
import { crearClienteNavegador } from "@/lib/supabase/client";

type Modo = "archivo" | "texto" | "link";
type Seccion = "revisar" | "gestion";

const CLAVE_VISTA = "centinela_vista";

const DESCRIPCION_VISTA: Record<Rol, string> = {
  autora:
    "Sube tu documento y recibe tu resultado completo: puntaje de cada criterio, citas del texto y recomendación.",
  revisora_nucleo:
    "Corre cualquier documento del equipo y revisa el reporte completo, con justificaciones y citas de ambos ejes.",
  administradora:
    "Gestiona el acceso del equipo y corre documentos con el reporte completo.",
};

function vistaInicial(roles: Rol[]): Rol {
  try {
    const guardada = localStorage.getItem(CLAVE_VISTA);
    if (esRol(guardada) && roles.includes(guardada)) return guardada;
  } catch {
    // sin almacenamiento local: se usa la vista por defecto
  }
  return roles.includes("autora") ? "autora" : ROLES.find((r) => roles.includes(r))!;
}

export default function HomePage() {
  const router = useRouter();
  const [perfil, setPerfil] = useState<PerfilPublico | null>(null);
  const [errorCuenta, setErrorCuenta] = useState<string | null>(null);
  const [vista, setVista] = useState<Rol>("autora");
  const [seccion, setSeccion] = useState<Seccion>("revisar");
  const [docAbierto, setDocAbierto] = useState<string | null>(null);

  const [titulo, setTitulo] = useState("");
  const [tituloManual, setTituloManual] = useState(false);
  const [autoras, setAutoras] = useState<AutoraOpcion[]>([]);
  const [autorId, setAutorId] = useState("");

  const [modo, setModo] = useState<Modo>("archivo");
  const [archivo, setArchivo] = useState<File | null>(null);
  const [texto, setTexto] = useState("");
  const [link, setLink] = useState("");
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reporte, setReporte] = useState<ReporteAPI | null>(null);

  useEffect(() => {
    fetch("/api/me")
      .then(async (res) => {
        if (res.status === 401) {
          router.replace("/login");
          return;
        }
        const data = await res.json();
        if (!res.ok) {
          setErrorCuenta(data.error || "No se pudo cargar tu cuenta.");
          return;
        }
        if (data.debe_cambiar_password) {
          router.replace("/cambiar-password");
          return;
        }
        setPerfil(data as PerfilPublico);
        setVista(vistaInicial((data as PerfilPublico).roles));
      })
      .catch(() => setErrorCuenta("Error de conexión."));
  }, [router]);

  // Revisoras y administradoras pueden subir un documento a nombre de una autora.
  useEffect(() => {
    if (!perfil || vista === "autora") return;
    fetch("/api/autoras")
      .then(async (res) => (res.ok ? setAutoras(await res.json()) : setAutoras([])))
      .catch(() => setAutoras([]));
  }, [perfil, vista]);

  function elegirVista(v: Rol) {
    setVista(v);
    setReporte(null);
    setError(null);
    setDocAbierto(null);
    setAutorId("");
    try {
      localStorage.setItem(CLAVE_VISTA, v);
    } catch {
      // no pasa nada si no se puede recordar
    }
  }

  // Desde la campanita: ir a la vista que corresponde y abrir el documento.
  function abrirDesdeNotificacion(n: NotificacionItem) {
    if (perfil && perfil.roles.includes(n.vista) && n.vista !== vista) elegirVista(n.vista);
    setSeccion("gestion");
    setDocAbierto(n.documento_id);
  }

  function elegirArchivo(f: File | null) {
    setArchivo(f);
    if (f && !tituloManual) setTitulo(f.name.replace(/\.[^.]+$/, ""));
  }

  async function cerrarSesion() {
    try {
      await crearClienteNavegador().auth.signOut();
    } finally {
      router.replace("/login");
      router.refresh();
    }
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setReporte(null);
    setCargando(true);
    try {
      const form = new FormData();
      form.set("vista", vista);
      form.set("titulo", titulo.trim());
      if (vista !== "autora" && autorId) form.set("autor_id", autorId);
      if (modo === "archivo" && archivo) form.set("archivo", archivo);
      if (modo === "texto") form.set("texto", texto);
      if (modo === "link") form.set("link", link);

      const res = await fetch("/api/review", { method: "POST", body: form });
      const data = await res.json();
      if (res.status === 401) {
        router.replace("/login");
        return;
      }
      if (!res.ok) {
        setError(data.error || "No se pudo analizar el documento.");
        return;
      }
      setReporte(data as ReporteAPI);
      // Cada envío queda como una entrada aparte: se limpia para el siguiente.
      setArchivo(null);
      setTexto("");
      setLink("");
      setTitulo("");
      setTituloManual(false);
    } catch {
      setError("Error de conexión al analizar el documento.");
    } finally {
      setCargando(false);
    }
  }

  const puedeEnviar =
    !cargando &&
    titulo.trim().length > 0 &&
    ((modo === "archivo" && !!archivo) ||
      (modo === "texto" && texto.trim().length > 20) ||
      (modo === "link" && link.trim().length > 10));

  if (errorCuenta) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6">
        <div className="card card-lg p-8 max-w-md text-center flex flex-col gap-4">
          <Logo size={48} />
          <p className="text-sm text-foreground">{errorCuenta}</p>
          <button
            onClick={cerrarSesion}
            className="self-center rounded-[10px] border border-border px-4 py-2 text-sm text-foreground-muted hover:text-foreground transition"
          >
            Cerrar sesión
          </button>
        </div>
      </div>
    );
  }

  if (!perfil) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-sm text-foreground-muted">Cargando…</p>
      </div>
    );
  }

  const rolesOrdenados = ROLES.filter((r) => perfil.roles.includes(r));

  return (
    <div className="min-h-screen w-full bg-background">
      <header className="border-b border-border">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <Logo size={40} />
            <div>
              <p className="font-semibold tracking-tight text-foreground leading-none">
                Centinela - App de Revisión Interna
              </p>
              <p className="text-xs text-foreground-muted leading-none mt-0.5">
                Venezuela Tierra de Gracia
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4 flex-wrap">
            {rolesOrdenados.length > 1 ? (
              <div
                role="tablist"
                aria-label="Vista"
                className="flex gap-1 rounded-full bg-surface border border-border p-1"
              >
                {rolesOrdenados.map((r) => (
                  <button
                    key={r}
                    role="tab"
                    aria-selected={vista === r}
                    onClick={() => elegirVista(r)}
                    className={`rounded-full px-3.5 py-1.5 text-sm font-medium transition ${
                      vista === r
                        ? "bg-foreground text-white shadow-sm"
                        : "text-foreground-muted hover:text-foreground"
                    }`}
                  >
                    {ROL_LABEL[r]}
                  </button>
                ))}
              </div>
            ) : (
              <span className="rounded-full bg-surface border border-border px-3.5 py-1.5 text-sm font-medium text-foreground">
                {ROL_LABEL[rolesOrdenados[0]]}
              </span>
            )}

            <div className="flex items-center gap-3">
              <NotificacionesBell onAbrir={abrirDesdeNotificacion} />
              <span className="text-sm text-foreground-muted hidden sm:inline">
                {perfil.nombre ?? perfil.email}
              </span>
              <button
                onClick={cerrarSesion}
                className="text-sm text-foreground-muted hover:text-foreground transition"
              >
                Cerrar sesión
              </button>
            </div>
          </div>
        </div>
        <nav
          aria-label="Secciones"
          className="max-w-6xl mx-auto px-6 flex gap-6 -mb-px overflow-x-auto"
        >
          {(
            [
              ["revisar", "Revisar documento"],
              ["gestion", "Gestión de documentos"],
            ] as [Seccion, string][]
          ).map(([clave, etiqueta]) => (
            <button
              key={clave}
              onClick={() => {
                setSeccion(clave);
                setDocAbierto(null);
              }}
              aria-current={seccion === clave ? "page" : undefined}
              className={`whitespace-nowrap border-b-2 pb-2.5 pt-1 text-sm font-medium transition ${
                seccion === clave
                  ? "border-foreground text-foreground"
                  : "border-transparent text-foreground-muted hover:text-foreground"
              }`}
            >
              {etiqueta}
            </button>
          ))}
        </nav>
        <div className="accent-stripe" />
      </header>

      <main className="max-w-6xl mx-auto px-6 py-10 flex flex-col gap-8">
        {seccion === "gestion" ? (
          <GestionDocumentos key={vista} vista={vista} abrirId={docAbierto} onAbrirId={setDocAbierto} />
        ) : (
          <>
        <div>
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-foreground">
            {vista === "administradora" ? "Administración y revisión" : "Revisar un documento"}
          </h1>
          <p className="text-sm text-foreground-muted mt-1 max-w-2xl">{DESCRIPCION_VISTA[vista]}</p>
        </div>

        {vista === "administradora" && <EquipoPanel />}

        <form onSubmit={onSubmit} className="card card-lg p-6 sm:p-8 flex flex-col gap-6">
          <div>
            <p className="text-sm font-medium text-foreground mb-2">Documento a revisar</p>
            <div className="flex gap-2 mb-3">
              {(
                [
                  ["archivo", "Archivo"],
                  ["texto", "Pegar texto"],
                  ["link", "Link de Google"],
                ] as [Modo, string][]
              ).map(([m, label]) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setModo(m)}
                  className={`rounded-[10px] px-3.5 py-2 text-sm font-medium transition ${
                    modo === m
                      ? "bg-surface text-foreground"
                      : "text-foreground-muted hover:bg-surface"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {modo === "archivo" && (
              <label className="flex flex-col items-center justify-center gap-2 rounded-[14px] border-2 border-dashed border-border px-6 py-10 text-center cursor-pointer hover:border-ve-azul/40 transition">
                <input
                  type="file"
                  accept=".pdf,.docx,.xlsx,.xls,.csv,.txt"
                  className="hidden"
                  onChange={(e) => elegirArchivo(e.target.files?.[0] ?? null)}
                />
                <span className="text-sm font-medium text-foreground">
                  {archivo ? archivo.name : "Haz clic para elegir un archivo"}
                </span>
                <span className="text-xs text-foreground-muted">
                  PDF, Word (.docx), Excel/Sheets (.xlsx, .csv)
                </span>
              </label>
            )}

            {modo === "texto" && (
              <textarea
                value={texto}
                onChange={(e) => setTexto(e.target.value)}
                rows={8}
                placeholder="Pega aquí el texto del documento…"
                className="w-full rounded-[14px] border border-border px-4 py-3 text-sm outline-none focus:border-ve-azul focus:ring-2 focus:ring-ve-azul/20 transition resize-none"
              />
            )}

            {modo === "link" && (
              <input
                type="url"
                value={link}
                onChange={(e) => setLink(e.target.value)}
                placeholder="https://docs.google.com/document/d/..."
                className="w-full rounded-[10px] border border-border px-4 py-3 text-sm outline-none focus:border-ve-azul focus:ring-2 focus:ring-ve-azul/20 transition"
              />
            )}
          </div>

          <div className={`grid gap-4 ${vista !== "autora" ? "sm:grid-cols-2" : ""}`}>
            <div className="flex flex-col gap-2">
              <label htmlFor="titulo" className="text-sm font-medium text-foreground">
                Nombre del documento
              </label>
              <input
                id="titulo"
                type="text"
                value={titulo}
                maxLength={200}
                onChange={(e) => {
                  setTitulo(e.target.value);
                  setTituloManual(e.target.value.trim().length > 0);
                }}
                placeholder="Ej.: Papel de trabajo — Modelos educativos"
                className="w-full rounded-[10px] border border-border px-4 py-3 text-sm outline-none focus:border-ve-azul focus:ring-2 focus:ring-ve-azul/20 transition"
              />
              <p className="text-xs text-foreground-muted">
                Con este nombre queda registrado en Gestión de documentos y se nombra el PDF.
              </p>
            </div>

            {vista !== "autora" && (
              <div className="flex flex-col gap-2">
                <label htmlFor="autora" className="text-sm font-medium text-foreground">
                  Autora del documento
                </label>
                <select
                  id="autora"
                  value={autorId}
                  onChange={(e) => setAutorId(e.target.value)}
                  className="w-full rounded-[10px] border border-border bg-white px-4 py-3 text-sm outline-none focus:border-ve-azul focus:ring-2 focus:ring-ve-azul/20 transition"
                >
                  <option value="">Yo ({perfil.nombre ?? perfil.email})</option>
                  {autoras
                    .filter((a) => a.email !== perfil.email)
                    .map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.nombre}
                      </option>
                    ))}
                </select>
                <p className="text-xs text-foreground-muted">
                  Si eliges a otra persona, el documento queda a su nombre y le llega un aviso.
                </p>
              </div>
            )}
          </div>

          {error && (
            <p className="text-sm text-rojo bg-rojo/5 rounded-[10px] px-3 py-2">{error}</p>
          )}

          <button
            type="submit"
            disabled={!puedeEnviar}
            className="self-start rounded-[10px] bg-foreground text-white font-medium px-6 py-3 transition hover:opacity-85 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {cargando ? "Analizando…" : "Analizar documento"}
          </button>
        </form>

        {reporte && (
          <div className="flex flex-col gap-6">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div className="min-w-0">
                <h2 className="text-lg font-medium text-foreground break-words">
                  {reporte.documento}
                </h2>
                <p className="mt-1 text-sm text-foreground-muted">
                  {reporte.autorNombre ? `${reporte.autorNombre} · ` : ""}
                  {formatearFecha(reporte.fecha)}
                </p>
              </div>
              {reporte.documentoId && <BotonPdf documentoId={reporte.documentoId} vista={vista} />}
            </div>

            {reporte.guardado ? (
              <p className="text-sm text-foreground-muted bg-surface rounded-[10px] px-3 py-2">
                Guardado en Gestión de documentos.{" "}
                <button
                  type="button"
                  onClick={() => {
                    setSeccion("gestion");
                    setDocAbierto(reporte.documentoId ?? null);
                  }}
                  className="font-medium text-foreground underline underline-offset-2"
                >
                  Ver en la lista
                </button>
              </p>
            ) : (
              <p className="text-sm text-[#8a6d00] bg-amarillo/10 rounded-[10px] px-3 py-2">
                El reporte se generó, pero no pudo guardarse en Gestión de documentos. Avisa a la
                administradora técnica.
              </p>
            )}

            <ReporteView reporte={reporte} />
          </div>
        )}
          </>
        )}
      </main>
    </div>
  );
}
