import { NextResponse } from "next/server";
import { obtenerSesion } from "@/lib/sesion";

export async function GET() {
  const sesion = await obtenerSesion();
  if (sesion.estado === "sin_sesion") {
    return NextResponse.json({ error: "No autenticado." }, { status: 401 });
  }
  if (sesion.estado === "sin_acceso") {
    return NextResponse.json(
      { error: "Tu cuenta no tiene acceso activo a Centinela. Escríbele a la Administradora." },
      { status: 403 }
    );
  }
  return NextResponse.json(sesion.perfil);
}
