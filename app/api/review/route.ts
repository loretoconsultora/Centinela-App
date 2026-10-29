import { NextResponse, type NextRequest } from "next/server";
import { analizarDocumento } from "@/lib/analyze";
import { construirReporte, type CriterioResultado } from "@/lib/rubric";
import { esRol, vistaVeDetalleCompleto, type Rol } from "@/lib/roles";
import {
  extraerDeArchivo,
  extraerDeLinkGoogle,
  extraerDeTexto,
} from "@/lib/extract";
import type { CriterioReporte, EjeReporte, ReporteAPI } from "@/lib/types";
import { obtenerSesion } from "@/lib/sesion";

export const maxDuration = 120;

function aEjeReporte(
  resultados: ReturnType<typeof construirReporte>["ejeA"],
  simplificado: boolean
): EjeReporte {
  const criterios: CriterioReporte[] = resultados.criterios.map((c) => ({
    id: c.id,
    numero: c.numero,
    nombre: c.nombre,
    peso: c.peso,
    puntaje: c.puntaje,
    color: c.color,
    eliminatorio: simplificado ? undefined : c.eliminatorio,
    justificacion: simplificado ? "" : c.justificacion,
    citaTextual: simplificado ? "" : c.citaTextual,
  }));
  return { promedio: resultados.promedio, color: resultados.color, criterios };
}

export async function POST(request: NextRequest) {
  const sesion = await obtenerSesion();
  if (sesion.estado === "sin_sesion") {
    return NextResponse.json({ error: "No autenticado." }, { status: 401 });
  }
  if (sesion.estado === "sin_acceso") {
    return NextResponse.json({ error: "Tu cuenta no tiene acceso activo." }, { status: 403 });
  }
  if (sesion.perfil.debe_cambiar_password) {
    return NextResponse.json(
      { error: "Primero debes cambiar tu contraseña inicial." },
      { status: 403 }
    );
  }

  try {
    const contentType = request.headers.get("content-type") || "";
    let texto = "";
    let nombreDocumento = "Documento sin título";
    let vistaPedida: unknown = "autora";
    let advertenciaExtraccion: string | undefined;

    if (contentType.includes("multipart/form-data")) {
      const form = await request.formData();
      vistaPedida = form.get("vista") || "autora";
      const archivo = form.get("archivo") as File | null;
      const textoPegado = form.get("texto") as string | null;
      const linkGoogle = form.get("link") as string | null;

      if (archivo && archivo.size > 0) {
        nombreDocumento = archivo.name;
        const buffer = Buffer.from(await archivo.arrayBuffer());
        const resultado = await extraerDeArchivo(buffer, archivo.name);
        texto = resultado.texto;
        advertenciaExtraccion = resultado.advertencia;
      } else if (linkGoogle && linkGoogle.trim()) {
        nombreDocumento = linkGoogle.trim();
        const resultado = await extraerDeLinkGoogle(linkGoogle.trim());
        texto = resultado.texto;
        advertenciaExtraccion = resultado.advertencia;
      } else if (textoPegado && textoPegado.trim()) {
        nombreDocumento = "Texto pegado";
        const resultado = extraerDeTexto(textoPegado);
        texto = resultado.texto;
        advertenciaExtraccion = resultado.advertencia;
      } else {
        return NextResponse.json(
          { error: "Sube un archivo, pega un link de Google Doc/Sheet, o pega el texto." },
          { status: 400 }
        );
      }
    } else {
      const body = await request.json();
      vistaPedida = body.vista || "autora";
      if (body.link) {
        nombreDocumento = body.link;
        const resultado = await extraerDeLinkGoogle(body.link);
        texto = resultado.texto;
        advertenciaExtraccion = resultado.advertencia;
      } else if (body.texto) {
        nombreDocumento = body.nombre || "Texto pegado";
        const resultado = extraerDeTexto(body.texto);
        texto = resultado.texto;
        advertenciaExtraccion = resultado.advertencia;
      } else {
        return NextResponse.json({ error: "No se recibió contenido para analizar." }, { status: 400 });
      }
    }

    // La vista la pide el navegador, pero solo se concede si la persona
    // tiene de verdad ese rol. Nadie puede pedir el reporte completo sin él.
    if (!esRol(vistaPedida) || !sesion.perfil.roles.includes(vistaPedida)) {
      return NextResponse.json({ error: "No tienes ese rol." }, { status: 403 });
    }
    const vista: Rol = vistaPedida;
    const simplificado = !vistaVeDetalleCompleto(vista);

    if (!texto || texto.trim().length < 50) {
      return NextResponse.json(
        { error: "No se pudo extraer suficiente texto del documento para analizarlo." },
        { status: 400 }
      );
    }

    const { ejeA, ejeB } = await analizarDocumento(texto, nombreDocumento);

    const reporte = construirReporte(
      ejeA as CriterioResultado[],
      ejeB as CriterioResultado[]
    );

    const respuesta: ReporteAPI = {
      documento: nombreDocumento,
      vista,
      fecha: new Date().toISOString(),
      dictamen: reporte.dictamen,
      // En la vista de Autora no se nombra qué modelo anterior disparó el
      // bloqueo (E2/E3); solo se informa si fue por la alineación con VTG (E1).
      eliminatoriosDisparados: simplificado
        ? reporte.eliminatoriosDisparados.filter((e) => e === "E1")
        : reporte.eliminatoriosDisparados,
      ejeA: aEjeReporte(reporte.ejeA, false),
      ejeB: aEjeReporte(reporte.ejeB, simplificado),
      advertenciaExtraccion,
    };

    return NextResponse.json(respuesta);
  } catch (err) {
    const mensaje = err instanceof Error ? err.message : "Error inesperado al analizar el documento.";
    return NextResponse.json({ error: mensaje }, { status: 500 });
  }
}
