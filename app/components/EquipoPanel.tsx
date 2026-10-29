"use client";

import { useEffect, useState } from "react";
import { ROL_LABEL, type PerfilEquipo } from "@/lib/roles";

// Vista de Administradora: quién tiene acceso y con qué rol.
// Por ahora es de solo lectura; las altas y cambios se hacen en Supabase.
export function EquipoPanel() {
  const [equipo, setEquipo] = useState<PerfilEquipo[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/equipo")
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) setError(data.error || "No se pudo cargar el equipo.");
        else setEquipo(data);
      })
      .catch(() => setError("Error de conexión."));
  }, []);

  return (
    <section className="card card-lg p-6 sm:p-8">
      <div className="mb-4">
        <h2 className="text-lg font-semibold tracking-tight text-foreground">Equipo y accesos</h2>
        <p className="text-sm text-foreground-muted mt-0.5">
          Personas con acceso a Centinela y el rol de cada una.
        </p>
      </div>

      {error && <p className="text-sm text-rojo">{error}</p>}
      {!equipo && !error && <p className="text-sm text-foreground-muted">Cargando…</p>}

      {equipo && (
        <div className="overflow-x-auto -mx-2">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-foreground-muted">
                <th className="px-2 py-2 font-medium">Nombre</th>
                <th className="px-2 py-2 font-medium">Correo</th>
                <th className="px-2 py-2 font-medium">Roles</th>
                <th className="px-2 py-2 font-medium">Estado</th>
              </tr>
            </thead>
            <tbody>
              {equipo.map((p) => (
                <tr key={p.email} className="border-t border-border align-top">
                  <td className="px-2 py-2.5 text-foreground">{p.nombre ?? "—"}</td>
                  <td className="px-2 py-2.5 text-foreground-muted">{p.email}</td>
                  <td className="px-2 py-2.5">
                    <div className="flex flex-wrap gap-1">
                      {p.roles.map((r) => (
                        <span
                          key={r}
                          className="rounded-full bg-surface border border-border px-2 py-0.5 text-xs text-foreground"
                        >
                          {ROL_LABEL[r]}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-2 py-2.5 text-xs">
                    {!p.activo ? (
                      <span className="text-rojo">Inactiva</span>
                    ) : p.debe_cambiar_password ? (
                      <span className="text-[#8a6d00]">Pendiente de cambiar contraseña</span>
                    ) : (
                      <span className="text-verde">Activa</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
