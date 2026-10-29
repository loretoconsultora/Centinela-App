"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Logo } from "@/app/components/Logo";
import { crearClienteNavegador } from "@/lib/supabase/client";

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [correo, setCorreo] = useState("");
  const [password, setPassword] = useState("");
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setCargando(true);
    setError(null);
    try {
      const supabase = crearClienteNavegador();
      const { error: errorLogin } = await supabase.auth.signInWithPassword({
        email: correo.trim().toLowerCase(),
        password,
      });
      if (errorLogin) {
        setError("Correo o contraseña incorrectos.");
        return;
      }
      const from = params.get("from");
      router.replace(from && from.startsWith("/") ? from : "/");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo iniciar sesión.");
    } finally {
      setCargando(false);
    }
  }

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-background px-6">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center gap-3 mb-8">
          <Logo size={72} />
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Centinela</h1>
          <p className="text-sm text-foreground-muted text-center">
            Revisión de alineación curricular · Venezuela Tierra de Gracia
          </p>
        </div>

        <form onSubmit={onSubmit} className="card card-lg p-8 flex flex-col gap-5">
          <div className="accent-stripe" />

          <div className="flex flex-col gap-2">
            <label htmlFor="correo" className="text-sm font-medium text-foreground">
              Correo
            </label>
            <input
              id="correo"
              type="email"
              autoComplete="username"
              autoFocus
              value={correo}
              onChange={(e) => setCorreo(e.target.value)}
              className="rounded-[10px] border border-border px-4 py-3 text-base outline-none focus:border-ve-azul focus:ring-2 focus:ring-ve-azul/20 transition"
              placeholder="tu@correo.com"
            />
          </div>

          <div className="flex flex-col gap-2">
            <label htmlFor="password" className="text-sm font-medium text-foreground">
              Contraseña
            </label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="rounded-[10px] border border-border px-4 py-3 text-base outline-none focus:border-ve-azul focus:ring-2 focus:ring-ve-azul/20 transition"
              placeholder="••••••••"
            />
            <p className="text-xs text-foreground-muted">
              ¿Primera vez? Entra con la contraseña inicial que te compartió la coordinación; te
              pediremos cambiarla.
            </p>
          </div>

          {error && (
            <p className="text-sm text-rojo bg-rojo/5 rounded-[10px] px-3 py-2">{error}</p>
          )}

          <button
            type="submit"
            disabled={cargando || correo.length === 0 || password.length === 0}
            className="rounded-[10px] bg-foreground text-white font-medium py-3 transition hover:opacity-85 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {cargando ? "Entrando…" : "Entrar"}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
