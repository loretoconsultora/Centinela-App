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
