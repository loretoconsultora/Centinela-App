import Anthropic from "@anthropic-ai/sdk";
import {
  EJE_A_CRITERIOS,
  EJE_B_CRITERIOS,
  TODOS_LOS_CRITERIOS,
  type CriterioResultado,
} from "./rubric";

// Modelo con mayor capacidad de razonamiento, para una calificación fina y
// citas textuales precisas. Si tu cuenta no tiene acceso a Opus, cambia esto
// por "claude-sonnet-5-5".
const MODEL = process.env.CENTINELA_MODEL || "claude-opus-5-5";

function construirPromptSistema(): string {
  const listaEjeA = EJE_A_CRITERIOS.map(
    (c) =>
      `${c.numero}. [${c.id}]${c.eliminatorio ? ` (⛔ eliminatorio ${c.eliminatorio})` : ""} ${c.nombre} — ${c.queEvalua}`
  ).join("\n");

  const listaEjeB = EJE_B_CRITERIOS.map(
    (c) =>
      `[${c.id}] (⛔ eliminatorio ${c.eliminatorio}) ${c.nombre} — ${c.queEvalua}`
  ).join("\n\n");

  return `Eres el motor de evaluación de "Centinela", la herramienta que usa el equipo del proyecto educativo "Venezuela Tierra de Gracia" (VTG) para calificar documentos curriculares (planes de área, núcleos curriculares, programas) contra la rúbrica oficial v3.

Vas a calificar el documento que te entregue el usuario en DOS EJES independientes, con un total de 10 criterios. Para cada criterio debes dar: un puntaje de 1.0 a 5.0 (puede llevar un decimal), una justificación breve (1-3 oraciones, en español), y una cita textual EXACTA tomada del documento que respalde tu puntaje (si de verdad no hay evidencia textual relevante, deja la cita vacía y dilo en la justificación).

## Eje A — Alineación con VTG
Evalúa qué tan alineado está el documento con el modelo curricular que el equipo está construyendo. Escala normal: 1 = nada alineado, 5 = totalmente alineado.

${listaEjeA}

## Eje B — Distancia crítica de modelos educativos anteriores (LÓGICA INVERTIDA)
Evalúa qué tan lejos está el documento del currículo bolivariano/chavista (2007) y del currículo pre-chavista de 1997. AMBOS modelos se tratan igual: acercarse a cualquiera de los dos resta puntos. Escala INVERTIDA — más parecido al modelo anterior = PEOR puntaje:
- 1 = Replica casi textualmente el lenguaje, la estructura o el ideario del modelo anterior.
- 2 = Usa varios términos o estructuras características del modelo anterior, aunque no de forma sistemática.
- 3 = Hay rastros puntuales, pero el grueso del documento no depende de ellos.
- 4 = Prácticamente sin rastros; lenguaje y estructura propios, con alguna coincidencia incidental y no ideológica.
- 5 = Ruptura total: cero lenguaje, estructura o ideario del modelo anterior.

${listaEjeB}

Reglas importantes:
- No calcules promedios ni el Dictamen final: solo entrega los 10 puntajes crudos, uno por criterio. El servidor hace el cálculo ponderado y la lógica de eliminatorios.
- Sé estricto y literal con las citas: deben ser fragmentos reales del texto entregado, no paráfrasis.
- Si el documento es muy corto o no cubre un criterio en absoluto, igual asigna un puntaje razonable (normalmente bajo, ej. 2.0) explicando en la justificación que el documento no lo aborda.
- Responde ÚNICAMENTE usando la herramienta "reportar_puntajes". No escribas texto fuera de la llamada a la herramienta.`;
}

const TOOL_SCHEMA: Anthropic.Tool = {
  name: "reportar_puntajes",
  description:
    "Reporta los 10 puntajes crudos (uno por criterio de la rúbrica Centinela v3), con justificación y cita textual para cada uno.",
  input_schema: {
    type: "object",
    properties: {
      criterios: {
        type: "array",
        description: "Exactamente 10 entradas, una por cada id de criterio de Eje A y Eje B.",
        items: {
          type: "object",
          properties: {
            id: {
              type: "string",
              enum: TODOS_LOS_CRITERIOS.map((c) => c.id),
            },
            puntaje: {
              type: "number",
              minimum: 1,
              maximum: 5,
            },
            justificacion: { type: "string" },
            cita_textual: { type: "string" },
          },
          required: ["id", "puntaje", "justificacion", "cita_textual"],
        },
      },
    },
    required: ["criterios"],
  },
};

interface PuntajeCrudo {
  id: string;
  puntaje: number;
  justificacion: string;
  cita_textual: string;
}

export interface AnalisisResultado {
  ejeA: CriterioResultado[];
  ejeB: CriterioResultado[];
}

function clampPuntaje(n: number): number {
  if (Number.isNaN(n)) return 1;
  return Math.min(5, Math.max(1, Math.round(n * 10) / 10));
}

export async function analizarDocumento(
  textoDocumento: string,
  nombreDocumento: string
): Promise<AnalisisResultado> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error(
      "Falta configurar la variable de entorno ANTHROPIC_API_KEY en el servidor."
    );
  }
  const client = new Anthropic({ apiKey });

  const mensajeUsuario = `Documento a evaluar: "${nombreDocumento}"\n\n---\n\n${textoDocumento}`;

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 4096,
    system: construirPromptSistema(),
    tools: [TOOL_SCHEMA],
    tool_choice: { type: "tool", name: "reportar_puntajes" },
    messages: [{ role: "user", content: mensajeUsuario }],
  });

  const toolUse = response.content.find(
    (block): block is Anthropic.ToolUseBlock => block.type === "tool_use"
  );
  if (!toolUse) {
    throw new Error("El modelo no devolvió los puntajes en el formato esperado.");
  }

  const input = toolUse.input as { criterios?: PuntajeCrudo[] };
  const criterios = input.criterios ?? [];

  const byId = new Map(criterios.map((c) => [c.id, c]));
  const idsEjeA = new Set(EJE_A_CRITERIOS.map((c) => c.id));
  const idsEjeB = new Set(EJE_B_CRITERIOS.map((c) => c.id));

  const faltantes = TODOS_LOS_CRITERIOS.filter((c) => !byId.has(c.id));
  if (faltantes.length > 0) {
    throw new Error(
      `El modelo no calificó todos los criterios (faltan: ${faltantes.map((c) => c.id).join(", ")}).`
    );
  }

  const aResultado = (c: PuntajeCrudo): CriterioResultado => ({
    id: c.id,
    puntaje: clampPuntaje(c.puntaje),
    justificacion: c.justificacion ?? "",
    citaTextual: c.cita_textual ?? "",
  });

  const ejeA = criterios.filter((c) => idsEjeA.has(c.id)).map(aResultado);
  const ejeB = criterios.filter((c) => idsEjeB.has(c.id)).map(aResultado);

  return { ejeA, ejeB };
}
