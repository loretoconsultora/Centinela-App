// Centinela — Extracción de texto desde los formatos de entrada aceptados:
// PDF, Word (.docx), link directo a Google Doc, Google Sheets / Excel.
//
// Nota: el .doc binario legado (Word 97-2003) no se puede extraer de forma
// confiable en un entorno serverless (requiere antiword/LibreOffice, que no
// están disponibles en Vercel). Para esos casos pedimos convertir a .docx,
// PDF, o pegar el texto directamente.

import * as XLSX from "xlsx";
import * as mammoth from "mammoth";
import { PDFParse } from "pdf-parse";
import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

export interface ExtraccionResultado {
  texto: string;
  advertencia?: string;
}

const MAX_CHARS = 180_000; // margen prudente para no exceder el contexto del modelo

function truncar(texto: string): ExtraccionResultado {
  if (texto.length > MAX_CHARS) {
    return {
      texto: texto.slice(0, MAX_CHARS),
      advertencia:
        "El documento es muy extenso y se truncó para el análisis; la calificación se basó solo en la primera parte del texto.",
    };
  }
  return { texto };
}

export async function extraerDePdf(buffer: Buffer): Promise<ExtraccionResultado> {
  const parser = new PDFParse({ data: buffer });
  try {
    const resultado = await parser.getText();
    return truncar(resultado.text ?? "");
  } finally {
    await parser.destroy();
  }
}

export async function extraerDeDocx(buffer: Buffer): Promise<ExtraccionResultado> {
  const result = await mammoth.extractRawText({ buffer });
  return truncar(result.value ?? "");
}

export function extraerDeHojaDeCalculo(buffer: Buffer): ExtraccionResultado {
  const workbook = XLSX.read(buffer, { type: "buffer" });
  const partes: string[] = [];
  for (const nombreHoja of workbook.SheetNames) {
    const hoja = workbook.Sheets[nombreHoja];
    const csv = XLSX.utils.sheet_to_csv(hoja);
    partes.push(`--- Hoja: ${nombreHoja} ---\n${csv}`);
  }
  return truncar(partes.join("\n\n"));
}

export function extraerDeTexto(texto: string): ExtraccionResultado {
  return truncar(texto);
}

function extraerIdDeUrl(url: string, patrones: RegExp[]): string | null {
  for (const patron of patrones) {
    const match = url.match(patron);
    if (match) return match[1];
  }
  return null;
}

/**
 * Intenta descargar el contenido de un link de Google Docs o Google Sheets
 * usando sus endpoints de exportación pública (/export?format=...). Esto
 * solo funciona si el documento está compartido como "cualquiera con el
 * link puede ver"; si falla, se le pide al usuario pegar el texto.
 */
export async function extraerDeLinkGoogle(url: string): Promise<ExtraccionResultado> {
  const idDoc = extraerIdDeUrl(url, [/\/document\/d\/([a-zA-Z0-9_-]+)/]);
  const idSheet = extraerIdDeUrl(url, [/\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/]);

  if (idDoc) {
    const exportUrl = `https://docs.google.com/document/d/${idDoc}/export?format=txt`;
    const res = await fetch(exportUrl);
    if (!res.ok) {
      throw new Error(
        "No se pudo leer el Google Doc. Verifica que el link tenga permiso de 'cualquiera con el link puede ver', o pega el texto directamente."
      );
    }
    return truncar(await res.text());
  }

  if (idSheet) {
    const exportUrl = `https://docs.google.com/spreadsheets/d/${idSheet}/export?format=csv`;
    const res = await fetch(exportUrl);
    if (!res.ok) {
      throw new Error(
        "No se pudo leer el Google Sheet. Verifica que el link tenga permiso de 'cualquiera con el link puede ver', o pega el texto directamente."
      );
    }
    return truncar(await res.text());
  }

  throw new Error(
    "El link no parece ser de Google Docs ni de Google Sheets. Pega el texto directamente o sube el archivo."
  );
}

// ---------------------------------------------------------------------------
// Links: Google Docs/Sheets, archivos de Google Drive (PDF, Word, Excel) y
// links directos a un PDF/Word/Excel/texto.
// ---------------------------------------------------------------------------

const MAX_DESCARGA = 30 * 1024 * 1024; // 30 MB
const MAX_REDIRECCIONES = 5;
const ESPERA_MS = 60_000;

const ANFITRIONES_GOOGLE = [
  "drive.google.com",
  "docs.google.com",
  "drive.usercontent.google.com",
];

function esAnfitrionGoogle(host: string): boolean {
  return (
    ANFITRIONES_GOOGLE.includes(host) ||
    host.endsWith(".googleusercontent.com") ||
    host.endsWith(".googleapis.com")
  );
}

function esIpPrivada(ip: string): boolean {
  if (ip.includes(":")) {
    const v = ip.toLowerCase();
    return (
      v === "::1" ||
      v === "::" ||
      v.startsWith("fe80") ||
      v.startsWith("fc") ||
      v.startsWith("fd") ||
      v.startsWith("::ffff:127.") ||
      v.startsWith("::ffff:10.") ||
      v.startsWith("::ffff:192.168.")
    );
  }
  const [a, b] = ip.split(".").map(Number);
  return (
    a === 10 ||
    a === 127 ||
    a === 0 ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    (a === 100 && b >= 64 && b <= 127)
  );
}

/** Solo https, y nunca hacia direcciones internas (el servidor descarga el link). */
async function validarDestino(url: URL): Promise<void> {
  const malo = new Error(
    "Ese link no se puede usar. Usa un link https público (Google Drive, Google Docs o un PDF directo)."
  );
  if (url.protocol !== "https:") throw malo;
  const host = url.hostname.toLowerCase();
  if (host === "localhost" || host.endsWith(".localhost") || host.endsWith(".local") || host.endsWith(".internal")) {
    throw malo;
  }
  if (isIP(host)) throw malo;
  if (esAnfitrionGoogle(host)) return;
  try {
    const direcciones = await lookup(host, { all: true });
    if (direcciones.length === 0 || direcciones.some((d) => esIpPrivada(d.address))) throw malo;
  } catch (e) {
    if (e === malo) throw malo;
    throw new Error("No se pudo encontrar ese link. Revisa que esté bien copiado.");
  }
}

interface Descarga {
  buffer: Buffer;
  tipoContenido: string;
  nombre: string | null;
}

async function descargarUna(url: URL): Promise<Descarga & { redireccion?: URL }> {
  await validarDestino(url);
  const res = await fetch(url, {
    redirect: "manual",
    signal: AbortSignal.timeout(ESPERA_MS),
    headers: { "User-Agent": "Mozilla/5.0 (compatible; Centinela/1.0)" },
  });
  if (res.status >= 300 && res.status < 400) {
    const destino = res.headers.get("location");
    if (!destino) throw new Error("El link redirige a una dirección que no se puede abrir.");
    return {
      buffer: Buffer.alloc(0),
      tipoContenido: "",
      nombre: null,
      redireccion: new URL(destino, url),
    };
  }
  if (!res.ok) {
    throw new Error(
      res.status === 404
        ? "No se encontró el archivo en ese link."
        : "No se pudo abrir el link. Verifica que esté compartido como 'cualquiera con el link puede ver'."
    );
  }
  const largo = Number(res.headers.get("content-length") ?? 0);
  if (largo > MAX_DESCARGA) {
    throw new Error("El archivo es demasiado grande (máximo 30 MB). Pega el texto o comparte una versión más liviana.");
  }
  const partes: Buffer[] = [];
  let total = 0;
  const lector = res.body?.getReader();
  if (!lector) throw new Error("El link no devolvió contenido.");
  for (;;) {
    const { done, value } = await lector.read();
    if (done) break;
    total += value.byteLength;
    if (total > MAX_DESCARGA) {
      await lector.cancel();
      throw new Error("El archivo es demasiado grande (máximo 30 MB). Pega el texto o comparte una versión más liviana.");
    }
    partes.push(Buffer.from(value));
  }
  const disposicion = res.headers.get("content-disposition") ?? "";
  const m = disposicion.match(/filename\*=UTF-8''([^;]+)/i) ?? disposicion.match(/filename="?([^";]+)"?/i);
  let nombre: string | null = null;
  if (m) {
    try {
      nombre = decodeURIComponent(m[1]);
    } catch {
      nombre = m[1];
    }
  }
  return {
    buffer: Buffer.concat(partes),
    tipoContenido: (res.headers.get("content-type") ?? "").toLowerCase(),
    nombre,
  };
}

/** Descarga siguiendo redirecciones a mano, validando cada salto. */
async function descargar(inicial: URL): Promise<Descarga> {
  let url = inicial;
  for (let i = 0; i <= MAX_REDIRECCIONES; i++) {
    const r = await descargarUna(url);
    if (!r.redireccion) {
      // Archivos grandes de Drive: Google muestra una página de "no se puede
      // analizar en busca de virus" con un formulario; se confirma una vez.
      if (r.tipoContenido.startsWith("text/html") && url.hostname.includes("google")) {
        const html = r.buffer.toString("utf-8");
        const form = html.match(/<form[^>]*id="download-form"[^>]*action="([^"]+)"/i);
        if (form) {
          const destino = new URL(form[1].replace(/&amp;/g, "&"));
          for (const campo of html.matchAll(/<input[^>]*type="hidden"[^>]*name="([^"]+)"[^>]*value="([^"]*)"/gi)) {
            destino.searchParams.set(campo[1], campo[2]);
          }
          const confirmado = await descargarUna(destino);
          if (!confirmado.redireccion) return confirmado;
        }
      }
      return r;
    }
    url = r.redireccion;
  }
  throw new Error("El link redirige demasiadas veces.");
}

function idDeDrive(url: URL): string | null {
  if (url.hostname !== "drive.google.com" && url.hostname !== "docs.google.com") return null;
  const enRuta = url.pathname.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (enRuta) return enRuta[1];
  if (url.pathname === "/open" || url.pathname === "/uc") return url.searchParams.get("id");
  return null;
}

/** Identifica el formato por el contenido (no se fía de la extensión del link). */
async function extraerPorContenido(d: Descarga, esDrive: boolean): Promise<ExtraccionResultado> {
  const b = d.buffer;
  if (b.length === 0) throw new Error("El link no devolvió ningún contenido.");

  if (b.subarray(0, 5).toString("latin1").startsWith("%PDF")) return extraerDePdf(b);

  if (b[0] === 0x50 && b[1] === 0x4b) {
    // ZIP: Word o Excel
    if (b.includes("word/")) return extraerDeDocx(b);
    if (b.includes("xl/")) return extraerDeHojaDeCalculo(b);
  }

  if (d.nombre) {
    const tipo = tipoPorNombre(d.nombre);
    if (tipo === "doc") {
      throw new Error("Los archivos .doc (Word 97-2003) no se pueden leer automáticamente. Conviértelo a .docx o PDF.");
    }
    if (tipo === "texto" || tipo === "hoja") return extraerDeArchivo(b, d.nombre);
  }

  if (d.tipoContenido.startsWith("text/html")) {
    throw new Error(
      esDrive
        ? "Google no dejó abrir el archivo. En Drive, pulsa Compartir y deja el acceso en 'Cualquier persona con el enlace' (como lector); luego prueba otra vez."
        : "Ese link abre una página web, no un archivo. Usa el link directo al PDF o al documento."
    );
  }
  if (d.tipoContenido.startsWith("text/") || d.tipoContenido.includes("csv")) {
    return extraerDeTexto(b.toString("utf-8"));
  }
  throw new Error(
    "No se pudo leer ese archivo. Los formatos aceptados son PDF, Word (.docx), Excel/CSV, Google Docs o Sheets, y texto."
  );
}

/**
 * Lee el documento desde un link: Google Doc/Sheet, archivo de Google Drive
 * (PDF, Word, Excel) o link directo a un PDF/Word/Excel/texto.
 */
export async function extraerDeLink(enlace: string): Promise<ExtraccionResultado> {
  let url: URL;
  try {
    url = new URL(enlace.trim());
  } catch {
    throw new Error("Eso no parece un link. Cópialo completo, empezando por https://");
  }

  // Google Docs y Sheets nativos se exportan como texto.
  if (/\/document\/d\/|\/spreadsheets\/d\//.test(url.pathname) && url.hostname === "docs.google.com") {
    return extraerDeLinkGoogle(enlace);
  }

  const idArchivo = idDeDrive(url);
  const destino = idArchivo
    ? new URL(`https://drive.usercontent.google.com/download?id=${encodeURIComponent(idArchivo)}&export=download&confirm=t`)
    : url;

  const descarga = await descargar(destino);
  return extraerPorContenido(descarga, !!idArchivo);
}

export function tipoPorNombre(nombreArchivo: string): "pdf" | "docx" | "doc" | "hoja" | "texto" | "desconocido" {
  const ext = nombreArchivo.toLowerCase().split(".").pop() ?? "";
  if (ext === "pdf") return "pdf";
  if (ext === "docx") return "docx";
  if (ext === "doc") return "doc";
  if (["xlsx", "xls", "csv"].includes(ext)) return "hoja";
  if (["txt", "md"].includes(ext)) return "texto";
  return "desconocido";
}

export async function extraerDeArchivo(
  buffer: Buffer,
  nombreArchivo: string
): Promise<ExtraccionResultado> {
  const tipo = tipoPorNombre(nombreArchivo);
  switch (tipo) {
    case "pdf":
      return extraerDePdf(buffer);
    case "docx":
      return extraerDeDocx(buffer);
    case "hoja":
      return extraerDeHojaDeCalculo(buffer);
    case "texto":
      return extraerDeTexto(buffer.toString("utf-8"));
    case "doc":
      throw new Error(
        "Los archivos .doc (Word 97-2003) no se pueden leer automáticamente aquí. Por favor convierte el documento a .docx o PDF, o pega el texto directamente."
      );
    default:
      throw new Error(
        `Formato de archivo no reconocido (${nombreArchivo}). Formatos aceptados: PDF, Word (.docx), Google Sheets/Excel (.xlsx/.csv), o texto pegado.`
      );
  }
}
