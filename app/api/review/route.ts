import { NextResponse, type NextRequest } from "next/server";
import { analizarDocumento } from "@/lib/analyze";
import {
  construirReporte,
  type CriterioResultado,
  type Rol,
} from "@/lib/rubric";
import {
  extraerDeArchivo,
  extraerDeLinkGoogle,
  extraerDeTexto,
} from "@/lib/extract";
import type { CriterioReporte, EjeReporte, ReporteAPI } from "@/lib/types";
import { PASSWORD_COOKIE, cookieEsValida } from "@/lib/auth";

export const maxDuration = 120;

function aEjeReporte(
  resultados: ReturnType<typeof construirReporte>["ejeA"],
  ocultarDetalleSensible: boolean
): EjeReporte {
  const criterios: CriterioReporte[] = resultados.criterios.map((c) => ({
    id: c.id,
    numero: c.numero,
    nombre: c.nombre,
    peso: c.peso,
    puntaje: c.puntaje,
    color: c.color,
    eliminatorio: ocultarDetalleSensible ? undefined : c.eliminatorio,
    justificacion: ocultarDetalleSensible ? "" : c.justificacion,
    citaTextual: ocultarDetalleSensible ? "" : c.citaTextual,
  }));
  return { promedio: resultados.promedio, color: resultados.color, criterios };
}

export async function POST(request: NextRequest) {
  const cookie = request.cookies.get(PASSWORD_COOKIE)?.value;
  if (!cookieEsValida(cookie)) {
    return NextResponse.json({ error: "No autenticado." }, { status: 401 });
  }

  try {
    const contentType = request.headers.get("content-type") || "";
    let texto = "";
    let nombreDocumento = "Documento sin título";
    let rol: Rol = "autora";
    let advertenciaExtraccion: string | undefined;

    if (contentType.includes("multipart/form-data")) {
      const form = await request.formData();
      rol = (form.get("rol") as Rol) || "autora";
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
      rol = body.rol || "autora";
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

    const ocultarDetalleEjeB = rol === "autora";

    const respuesta: ReporteAPI = {
      documento: nombreDocumento,
      rol,
      fecha: new Date().toISOString(),
      dictamen: reporte.dictamen,
      eliminatoriosDisparados: reporte.eliminatoriosDisparados,
      ejeA: aEjeReporte(reporte.ejeA, false),
      ejeB: aEjeReporte(reporte.ejeB, ocultarDetalleEjeB),
      advertenciaExtraccion,
    };

    return NextResponse.json(respuesta);
  } catch (err) {
    const mensaje = err instanceof Error ? err.message : "Error inesperado al analizar el documento.";
    return NextResponse.json({ error: mensaje }, { status: 500 });
  }
}
