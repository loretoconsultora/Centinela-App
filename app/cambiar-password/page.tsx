"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Logo } from "@/app/components/Logo";
import { crearClienteNavegador } from "@/lib/supabase/client";

export default function CambiarPasswordPage() {
  const router = useRouter();
  const [correo, setCorreo] = useState<string | null>(null);
  const [nueva, setNueva] = useState("");
  const [repetir, setRepetir] = useState("");
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/me")
      .then(async (res) => {
        if (res.status === 401) {
          router.replace("/login");
          return;
        }
        const data = await res.json();
        if (res.ok) setCorreo(data.email);
        else setError(data.error || "No se pudo cargar tu cuenta.");
      })
      .catch(() => setError("Error de conexión."));
  }, [router]);

  const coincide = nueva === repetir;
  const largoOk = nueva.length >= 8;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!largoOk || !coincide || !correo) return;
    setCargando(true);
    setError(null);
    try {
      const res = await fetch("/api/cambiar-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: nueva }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "No se pudo cambiar la contraseña.");
        return;
      }
      // Volvemos a iniciar sesión con la contraseña nueva para renovar la sesión.
      const supabase = crearClienteNavegador();
      await supabase.auth.signInWithPassword({ email: correo, password: nueva });
      router.replace("/");
      router.refresh();
    } catch {
      setError("Error de conexión al cambiar la contraseña.");
    } finally {
      setCargando(false);
    }
  }

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-background px-6">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center gap-3 mb-8">
          <Logo size={56} />
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Elige tu contraseña
          </h1>
          <p className="text-sm text-foreground-muted text-center">
            Es tu primer ingreso. Reemplaza la contraseña inicial por una propia para continuar.
          </p>
        </div>

        <form onSubmit={onSubmit} className="card card-lg p-8 flex flex-col gap-5">
          <div className="accent-stripe" />

          <div className="flex flex-col gap-2">
            <label htmlFor="nueva" className="text-sm font-medium text-foreground">
              Contraseña nueva
            </label>
            <input
              id="nueva"
              type="password"
              autoComplete="new-password"
              autoFocus
              value={nueva}
              onChange={(e) => setNueva(e.target.value)}
              className="rounded-[10px] border border-border px-4 py-3 text-base outline-none focus:border-ve-azul focus:ring-2 focus:ring-ve-azul/20 transition"
            />
            <p className={`text-xs ${nueva.length === 0 || largoOk ? "text-foreground-muted" : "text-rojo"}`}>
              Mínimo 8 caracteres.
            </p>
          </div>

          <div className="flex flex-col gap-2">
            <label htmlFor="repetir" className="text-sm font-medium text-foreground">
              Repite la contraseña
            </label>
            <input
              id="repetir"
              type="password"
              autoComplete="new-password"
              value={repetir}
              onChange={(e) => setRepetir(e.target.value)}
              className="rounded-[10px] border border-border px-4 py-3 text-base outline-none focus:border-ve-azul focus:ring-2 focus:ring-ve-azul/20 transition"
            />
            {repetir.length > 0 && !coincide && (
              <p className="text-xs text-rojo">Las contraseñas no coinciden.</p>
            )}
          </div>

          {error && (
            <p className="text-sm text-rojo bg-rojo/5 rounded-[10px] px-3 py-2">{error}</p>
          )}

          <button
            type="submit"
            disabled={cargando || !largoOk || !coincide || !correo}
            className="rounded-[10px] bg-foreground text-white font-medium py-3 transition hover:opacity-85 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {cargando ? "Guardando…" : "Guardar y continuar"}
          </button>
        </form>
      </div>
    </div>
  );
}
