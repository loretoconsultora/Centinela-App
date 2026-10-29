import { NextResponse, type NextRequest } from "next/server";
import { analizarDocumento } from "@/lib/analyze";
import { construirReporte, type CriterioResultado } from "@/lib/rubric";
import { esRol, type Rol } from "@/lib/roles";
import {
  extraerDeArchivo,
  extraerDeLink,
  extraerDeTexto,
} from "@/lib/extract";
import { armarReporteGuardado, reporteParaVista } from "@/lib/reporte-api";
import { guardarDocumento, resolverAutor } from "@/lib/guardar-documento";
import { obtenerSesion } from "@/lib/sesion";

export const maxDuration = 300;

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
    let autorPedido: string | null = null;
    let tituloPedido = "";
    let sinNombrePropio = false; // texto pegado o link: la persona debe nombrarlo
    let advertenciaExtraccion: string | undefined;

    if (contentType.includes("multipart/form-data")) {
      const form = await request.formData();
      vistaPedida = form.get("vista") || "autora";
      const autorForm = form.get("autor_id");
      autorPedido = typeof autorForm === "string" && autorForm ? autorForm : null;
      const tituloForm = form.get("titulo");
      tituloPedido = typeof tituloForm === "string" ? tituloForm.trim() : "";
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
        sinNombrePropio = true;
        const resultado = await extraerDeLink(linkGoogle.trim());
        texto = resultado.texto;
        advertenciaExtraccion = resultado.advertencia;
      } else if (textoPegado && textoPegado.trim()) {
        nombreDocumento = "Texto pegado";
        sinNombrePropio = true;
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
      autorPedido = typeof body.autor_id === "string" && body.autor_id ? body.autor_id : null;
      tituloPedido = typeof body.titulo === "string" ? body.titulo.trim() : "";
      if (body.link) {
        nombreDocumento = body.link;
        sinNombrePropio = true;
        const resultado = await extraerDeLink(body.link);
        texto = resultado.texto;
        advertenciaExtraccion = resultado.advertencia;
      } else if (body.texto) {
        nombreDocumento = body.nombre || "Texto pegado";
        sinNombrePropio = !body.nombre;
        const resultado = extraerDeTexto(body.texto);
        texto = resultado.texto;
        advertenciaExtraccion = resultado.advertencia;
      } else {
        return NextResponse.json({ error: "No se recibió contenido para analizar." }, { status: 400 });
      }
    }

    // Cada envío es una entrada aparte, con su propio nombre. Un texto pegado o
    // un link no traen nombre, así que hay que escribirlo.
    if (tituloPedido) {
      nombreDocumento = tituloPedido.slice(0, 200);
    } else if (sinNombrePropio) {
      return NextResponse.json(
        { error: "Escribe el nombre del documento para poder registrarlo." },
        { status: 400 }
      );
    }

    // La vista la pide el navegador, pero solo se concede si la persona
    // tiene de verdad ese rol. Nadie puede pedir el reporte completo sin él.
    if (!esRol(vistaPedida) || !sesion.perfil.roles.includes(vistaPedida)) {
      return NextResponse.json({ error: "No tienes ese rol." }, { status: 403 });
    }
    const vista: Rol = vistaPedida;

    if (!texto || texto.trim().length < 50) {
      return NextResponse.json(
        { error: "No se pudo extraer suficiente texto del documento para analizarlo." },
        { status: 400 }
      );
    }

    const autor = await resolverAutor(sesion, vista, autorPedido);
    if (!autor) {
      return NextResponse.json(
        { error: "La autora elegida no existe o no tiene el rol de autora." },
        { status: 400 }
      );
    }

    const { ejeA, ejeB, uso, hallazgoPrincipal, recomendacion } = await analizarDocumento(texto, nombreDocumento);

    const reporte = construirReporte(
      ejeA as CriterioResultado[],
      ejeB as CriterioResultado[]
    );

    const fecha = new Date().toISOString();
    const guardado = armarReporteGuardado(
      reporte,
      nombreDocumento,
      fecha,
      { hallazgoPrincipal, recomendacion },
      advertenciaExtraccion
    );

    // Se registra en "Gestión de documentos". Si el guardado falla (p. ej. aún
    // no se corrió el SQL 02), la persona igual recibe su reporte.
    const registro = await guardarDocumento({
      sesion,
      autor,
      reporte: guardado,
      uso,
    });

    const respuesta = {
      ...reporteParaVista(guardado, vista),
      documentoId: registro.documentoId,
      autorNombre: registro.autorNombre,
      guardado: registro.guardado,
    };

    return NextResponse.json(respuesta);
  } catch (err) {
    const mensaje = err instanceof Error ? err.message : "Error inesperado al analizar el documento.";
    return NextResponse.json({ error: mensaje }, { status: 500 });
  }
}
