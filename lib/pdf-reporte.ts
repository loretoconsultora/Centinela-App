import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import type { EjeReporte, ReporteGuardado } from "./types";
import { ETIQUETA_ESTADO, formatearFecha } from "./documentos";
import type { ColorBand } from "./rubric";

// PDF del reporte, armado con pdf-lib y las fuentes estándar de PDF (sin
// archivos externos, así funciona igual en Vercel). Esas fuentes cubren el
// español completo; cualquier símbolo fuera de ese juego (emojis, etc.) se quita.

const A4: [number, number] = [595.28, 841.89];
const MARGEN = 50;
const ANCHO = A4[0] - MARGEN * 2;

const COLORES = {
  texto: rgb(0.11, 0.11, 0.12),
  suave: rgb(0.43, 0.43, 0.45),
  linea: rgb(0.88, 0.88, 0.9),
  fondo: rgb(0.97, 0.97, 0.98),
  rojo: rgb(0.81, 0.08, 0.17),
  amarillo: rgb(0.71, 0.54, 0),
  verde: rgb(0.12, 0.54, 0.3),
  rojoFondo: rgb(0.99, 0.93, 0.93),
  amarilloFondo: rgb(1, 0.97, 0.88),
  verdeFondo: rgb(0.92, 0.97, 0.94),
};

const COLOR_BANDA: Record<ColorBand, { fg: ReturnType<typeof rgb>; etiqueta: string }> = {
  rojo: { fg: COLORES.rojo, etiqueta: "Rojo" },
  amarillo: { fg: COLORES.amarillo, etiqueta: "Amarillo" },
  verde: { fg: COLORES.verde, etiqueta: "Verde" },
};

class Escritor {
  pagina: PDFPage;
  y: number;
  constructor(
    private doc: PDFDocument,
    private normal: PDFFont,
    private negrita: PDFFont,
    private cursiva: PDFFont
  ) {
    this.pagina = doc.addPage(A4);
    this.y = A4[1] - MARGEN;
  }

  private limpio(texto: string, fuente: PDFFont): string {
    const permitidos = new Set(fuente.getCharacterSet());
    let salida = "";
    for (const ch of texto.replace(/ /g, " ").replace(/[\t\r]+/g, " ")) {
      const cp = ch.codePointAt(0)!;
      if (ch === "\n") salida += " ";
      else if (permitidos.has(cp)) salida += ch;
      else if (ch === "‑" || ch === "−") salida += "-";
      // lo demás (emojis, símbolos raros) se omite
    }
    return salida;
  }

  asegurar(alto: number) {
    if (this.y - alto < MARGEN + 20) {
      this.pagina = this.doc.addPage(A4);
      this.y = A4[1] - MARGEN;
    }
  }

  espacio(n: number) {
    this.y -= n;
  }

  lineas(texto: string, fuente: PDFFont, tam: number, ancho: number): string[] {
    const limpio = this.limpio(texto, fuente).trim();
    if (!limpio) return [];
    const palabras = limpio.split(/\s+/);
    const salida: string[] = [];
    let actual = "";
    for (const p of palabras) {
      const prueba = actual ? `${actual} ${p}` : p;
      if (fuente.widthOfTextAtSize(prueba, tam) <= ancho) {
        actual = prueba;
      } else {
        if (actual) salida.push(actual);
        // palabra más ancha que la línea: se corta
        let resto = p;
        while (fuente.widthOfTextAtSize(resto, tam) > ancho) {
          let n = resto.length;
          while (n > 1 && fuente.widthOfTextAtSize(resto.slice(0, n), tam) > ancho) n--;
          salida.push(resto.slice(0, n));
          resto = resto.slice(n);
        }
        actual = resto;
      }
    }
    if (actual) salida.push(actual);
    return salida;
  }

  parrafo(
    texto: string,
    opts: {
      tam?: number;
      negrita?: boolean;
      cursiva?: boolean;
      color?: ReturnType<typeof rgb>;
      sangria?: number;
      ancho?: number;
      interlineado?: number;
    } = {}
  ) {
    const tam = opts.tam ?? 10;
    const fuente = opts.negrita ? this.negrita : opts.cursiva ? this.cursiva : this.normal;
    const sangria = opts.sangria ?? 0;
    const ancho = (opts.ancho ?? ANCHO) - sangria;
    const alto = tam * (opts.interlineado ?? 1.35);
    for (const linea of this.lineas(texto, fuente, tam, ancho)) {
      this.asegurar(alto);
      this.y -= alto;
      this.pagina.drawText(linea, {
        x: MARGEN + sangria,
        y: this.y + tam * 0.25,
        size: tam,
        font: fuente,
        color: opts.color ?? COLORES.texto,
      });
    }
  }

  linea() {
    this.asegurar(10);
    this.pagina.drawLine({
      start: { x: MARGEN, y: this.y },
      end: { x: MARGEN + ANCHO, y: this.y },
      thickness: 0.6,
      color: COLORES.linea,
    });
  }

  /** Texto alineado a la derecha en la línea actual (para puntajes). */
  derecha(texto: string, y: number, tam: number, color: ReturnType<typeof rgb>, negrita = true) {
    const fuente = negrita ? this.negrita : this.normal;
    const t = this.limpio(texto, fuente);
    const w = fuente.widthOfTextAtSize(t, tam);
    this.pagina.drawText(t, { x: MARGEN + ANCHO - w, y, size: tam, font: fuente, color });
  }

  caja(alto: number, fondo: ReturnType<typeof rgb>, borde: ReturnType<typeof rgb>) {
    this.pagina.drawRectangle({
      x: MARGEN,
      y: this.y - alto,
      width: ANCHO,
      height: alto,
      color: fondo,
      borderColor: borde,
      borderWidth: 0.8,
    });
  }

  pieDePagina() {
    const paginas = this.doc.getPages();
    paginas.forEach((p, i) => {
      const t = `Centinela · Venezuela Tierra de Gracia · pág. ${i + 1} de ${paginas.length}`;
      const w = this.normal.widthOfTextAtSize(this.limpio(t, this.normal), 8);
      p.drawText(this.limpio(t, this.normal), {
        x: (A4[0] - w) / 2,
        y: 28,
        size: 8,
        font: this.normal,
        color: COLORES.suave,
      });
    });
  }
}

function seccionEje(e: Escritor, titulo: string, subtitulo: string, eje: EjeReporte) {
  e.espacio(14);
  e.asegurar(60);
  const banda = COLOR_BANDA[eje.color];
  e.parrafo(titulo, { tam: 14, negrita: true });
  e.derecha(`${eje.promedio.toFixed(2)}  ${banda.etiqueta}`, e.y + 4, 12, banda.fg);
  e.parrafo(subtitulo, { tam: 9, color: COLORES.suave });
  e.espacio(4);
  e.linea();

  for (const c of eje.criterios) {
    e.espacio(8);
    e.asegurar(48);
    const b = COLOR_BANDA[c.color];
    const etiquetaElim = c.eliminatorio ? `[Eliminatorio ${c.eliminatorio}] ` : "";
    e.parrafo(`${etiquetaElim}${c.nombre} · ${Math.round(c.peso * 100)}%`, {
      tam: 10.5,
      negrita: true,
      ancho: ANCHO - 90,
    });
    e.derecha(`${c.puntaje.toFixed(1)}  ${b.etiqueta}`, e.y + 3, 10.5, b.fg);
    if (c.justificacion) e.parrafo(c.justificacion, { tam: 9.5, color: COLORES.suave });
    if (c.citaTextual) {
      e.espacio(2);
      e.parrafo(`"${c.citaTextual}"`, { tam: 9, cursiva: true, color: COLORES.suave, sangria: 12 });
    }
    e.espacio(4);
    e.linea();
  }
}

export interface EntradaPdf {
  reporte: ReporteGuardado;
  autorNombre: string;
  /** Fecha en que se generó el documento (ISO). */
  creadoEn: string;
}

export async function generarPdfReporte(entrada: EntradaPdf): Promise<Uint8Array> {
  const { reporte, autorNombre, creadoEn } = entrada;
  const doc = await PDFDocument.create();
  doc.setTitle(`Resultado Revisión - ${reporte.documento}`);
  doc.setAuthor("Centinela · Venezuela Tierra de Gracia");
  doc.setCreator("Centinela");

  const normal = await doc.embedFont(StandardFonts.Helvetica);
  const negrita = await doc.embedFont(StandardFonts.HelveticaBold);
  const cursiva = await doc.embedFont(StandardFonts.HelveticaOblique);
  const e = new Escritor(doc, normal, negrita, cursiva);

  // Encabezado
  e.parrafo("Resultado Revisión", { tam: 11, color: COLORES.suave, negrita: true });
  e.espacio(2);
  e.parrafo(reporte.documento, { tam: 18, negrita: true, interlineado: 1.25 });
  e.espacio(4);
  e.parrafo(`Autora: ${autorNombre}`, { tam: 10 });
  e.parrafo(`Fecha del documento: ${formatearFecha(creadoEn)} (hora de Venezuela)`, { tam: 10 });
  e.espacio(10);

  // Dictamen
  const fondo =
    reporte.dictamen === "bloqueado"
      ? COLORES.rojoFondo
      : reporte.dictamen === "aprobado_con_observaciones"
        ? COLORES.amarilloFondo
        : COLORES.verdeFondo;
  const colorDictamen =
    reporte.dictamen === "bloqueado"
      ? COLORES.rojo
      : reporte.dictamen === "aprobado_con_observaciones"
        ? COLORES.amarillo
        : COLORES.verde;
  e.asegurar(50);
  e.caja(40, fondo, colorDictamen);
  e.pagina.drawText("Dictamen final", {
    x: MARGEN + 12,
    y: e.y - 14,
    size: 8.5,
    font: normal,
    color: COLORES.suave,
  });
  e.pagina.drawText(ETIQUETA_ESTADO[reporte.dictamen], {
    x: MARGEN + 12,
    y: e.y - 31,
    size: 15,
    font: negrita,
    color: colorDictamen,
  });
  e.espacio(52);

  if (reporte.explicacionDictamen) {
    e.parrafo("Por qué quedó así", { tam: 11, negrita: true });
    e.parrafo(reporte.explicacionDictamen, { tam: 10 });
    e.espacio(10);
  }
  if (reporte.hallazgoPrincipal) {
    e.parrafo("Hallazgo principal", { tam: 11, negrita: true });
    e.parrafo(reporte.hallazgoPrincipal, { tam: 10 });
    e.espacio(10);
  }
  if (reporte.recomendacion) {
    e.parrafo("Recomendación para la autora", { tam: 11, negrita: true });
    e.parrafo(reporte.recomendacion, { tam: 10 });
    e.espacio(6);
  }
  if (reporte.advertenciaExtraccion) {
    e.parrafo(`Nota sobre la lectura del archivo: ${reporte.advertenciaExtraccion}`, {
      tam: 9,
      cursiva: true,
      color: COLORES.suave,
    });
  }

  seccionEje(
    e,
    "Eje A - Alineación con VTG",
    "Qué tan alineado está el documento con el modelo que estamos construyendo.",
    reporte.ejeA
  );
  seccionEje(
    e,
    "Eje B - Distancia del modelo anterior",
    "Qué tan lejos está del currículo bolivariano (2007) y del de 1997. Más parecido = peor.",
    reporte.ejeB
  );

  e.pieDePagina();
  return doc.save();
}

/** Nombre de archivo: "Resultado Revisión - <nombre del documento>.pdf" */
export function nombreArchivoPdf(nombreDocumento: string): string {
  const base = nombreDocumento
    .replace(/\.(pdf|docx?|xlsx?|csv|txt)$/i, "")
    .replace(/https?:\/\//i, "")
    .replace(/[\\/:*?"<>|\u0000-\u001f]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 100);
  return `Resultado Revisión - ${base || "documento"}.pdf`;
}
