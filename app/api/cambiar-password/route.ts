import { NextResponse, type NextRequest } from "next/server";
import { obtenerSesion } from "@/lib/sesion";
import { crearClienteAdmin } from "@/lib/supabase/admin";

// La contraseña inicial NO se escribe en el código (el repo puede ser público):
// se lee de la variable opcional CENTINELA_PASSWORD_INICIAL en Vercel.
const CONTRASENA_INICIAL = (process.env.CENTINELA_PASSWORD_INICIAL ?? "").toLowerCase();

export async function POST(request: NextRequest) {
  const sesion = await obtenerSesion();
  if (sesion.estado === "sin_sesion") {
    return NextResponse.json({ error: "No autenticado." }, { status: 401 });
  }
  if (sesion.estado === "sin_acceso") {
    return NextResponse.json({ error: "Tu cuenta no tiene acceso activo." }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const nueva = typeof body?.password === "string" ? body.password : "";

  if (nueva.length < 8) {
    return NextResponse.json(
      { error: "La contraseña debe tener al menos 8 caracteres." },
      { status: 400 }
    );
  }
  if (CONTRASENA_INICIAL && nueva.toLowerCase() === CONTRASENA_INICIAL) {
    return NextResponse.json(
      { error: "Elige una contraseña distinta a la inicial." },
      { status: 400 }
    );
  }

  try {
    const admin = crearClienteAdmin();
    const { error: errorClave } = await admin.auth.admin.updateUserById(sesion.user.id, {
      password: nueva,
    });
    if (errorClave) {
      return NextResponse.json(
        { error: "No se pudo cambiar la contraseña. Intenta con otra." },
        { status: 400 }
      );
    }
    const { error: errorPerfil } = await admin
      .from("profiles")
      .update({ debe_cambiar_password: false })
      .eq("id", sesion.user.id);
    if (errorPerfil) {
      return NextResponse.json(
        { error: "La contraseña cambió, pero no se pudo actualizar tu perfil. Avisa a la Administradora." },
        { status: 500 }
      );
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    const mensaje = err instanceof Error ? err.message : "Error inesperado.";
    return NextResponse.json({ error: mensaje }, { status: 500 });
  }
}
