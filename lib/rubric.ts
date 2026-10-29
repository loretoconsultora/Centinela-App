// Centinela — Motor de la Rúbrica de Revisión de Contenidos (v3, final)
// Fuente: "Centinela — Rúbrica de Revisión de Contenidos (v3, final)" (Google Docs, 29 oct 2026)
//
// Esta rúbrica califica un documento en dos ejes independientes y aplica un
// tercer filtro —los criterios eliminatorios— que puede bloquear un
// documento sin importar qué tan bien promedie en lo demás.

export type ColorBand = "rojo" | "amarillo" | "verde";

export type Eliminatorio = "E1" | "E2" | "E3";

export interface CriterioDef {
  id: string;
  eje: "A" | "B";
  numero: number;
  nombre: string;
  peso: number; // fracción del eje (no del total), suma 1 dentro de cada eje
  queEvalua: string;
  eliminatorio?: Eliminatorio;
  invertido?: boolean; // true en Eje B: acercarse al modelo anterior resta puntos
}

export interface AnclaPuntaje {
  puntaje: number;
  significado: string;
}

// ---------------------------------------------------------------------------
// Eje A — Alineación con VTG (8 criterios, pesos suman 100% del eje)
// ---------------------------------------------------------------------------
export const EJE_A_CRITERIOS: CriterioDef[] = [
  {
    id: "alineacion_vtg",
    eje: "A",
    numero: 1,
    nombre: "Alineación con la visión y los valores de VTG",
    peso: 0.15,
    queEvalua:
      "Libertad, autonomía, capacidad de decidir por sí mismo; ausencia de adoctrinamiento ideológico o politización; ciudadano protagonista de su proyecto de vida.",
    eliminatorio: "E1",
  },
  {
    id: "coherencia_pedagogica",
    eje: "A",
    numero: 2,
    nombre: "Coherencia con el modelo pedagógico",
    peso: 0.15,
    queEvalua:
      "Constructivista / por competencias / híbrido, respetando la etapa (El Rescate vs. El Despegue).",
  },
  {
    id: "pilares_educativos",
    eje: "A",
    numero: 3,
    nombre: "Integración de los Pilares Educativos",
    peso: 0.10,
    queEvalua:
      "Aprender a Conocer, a Hacer, a Ser, a Convivir y Participar, y a Aprender.",
  },
  {
    id: "ejes_transversales",
    eje: "A",
    numero: 4,
    nombre: "Presencia de los Ejes Transversales Nucleares",
    peso: 0.10,
    queEvalua:
      "Pensamiento crítico/filosófico/creativo/sistémico; valores democráticos; razonamiento consecuencial.",
  },
  {
    id: "abp_stem",
    eje: "A",
    numero: 5,
    nombre: "Uso correcto de ABP y STEM (cuando aplique)",
    peso: 0.10,
    queEvalua: "Metodologías transversales bien aplicadas, no forzadas.",
  },
  {
    id: "competencias_metas",
    eje: "A",
    numero: 6,
    nombre: "Calidad de competencias y metas de aprendizaje",
    peso: 0.15,
    queEvalua:
      "Formato competencia → metas medibles; saber ser / saber conocer / saber hacer.",
  },
  {
    id: "sistema_evaluacion",
    eje: "A",
    numero: 7,
    nombre: "Coherencia con el sistema de evaluación",
    peso: 0.10,
    queEvalua:
      "Cualitativa + cuantitativa (0–20), formativa, compatible con evaluación externa (AVCE).",
  },
  {
    id: "rigor_claridad",
    eje: "A",
    numero: 8,
    nombre: "Rigor, claridad y comparabilidad internacional",
    peso: 0.15,
    queEvalua:
      "Redacción clara, nivel comparable a Finlandia/Massachusetts, consistencia interna.",
  },
];

// ---------------------------------------------------------------------------
// Eje B — Distancia crítica de modelos educativos anteriores (lógica invertida)
// Ambos modelos (bolivariano/chavista 2007 y 1997) se tratan igual: acercarse
// a cualquiera de los dos resta puntos.
// ---------------------------------------------------------------------------
export const EJE_B_CRITERIOS: CriterioDef[] = [
  {
    id: "distancia_cnb2007",
    eje: "B",
    numero: 1,
    nombre:
      "Distancia del Currículo Nacional Bolivariano (CNB, 2007)",
    peso: 0.5,
    invertido: true,
    eliminatorio: "E2",
    queEvalua:
      "Señales de alerta: lenguaje identitario-ideológico (\"ideario bolivariano\", \"nuevo republicano/nueva republicana\", \"refundación de la República\", citas de Bolívar/Simón Rodríguez/Ezequiel Zamora/Paulo Freire como fundamento pedagógico-político); \"desarrollo endógeno\", \"trabajo liberador\", \"economía social\", \"propiedad colectiva\", \"bien común colectivo\" como eje dominante sobre el individuo; estructura por \"Ejes Integradores\" + 4 pilares propios del CNB (distintos a los 5 de VTG); apelación a \"Poder Popular\", \"Consejos Comunales\", \"soberanía y defensa integral de la nación\" en vez de libertad individual y autonomía; \"Ministerio del Poder Popular para la Educación\" u otra terminología administrativa bolivariana como referencia normativa vigente.",
  },
  {
    id: "distancia_cbn1997",
    eje: "B",
    numero: 2,
    nombre: "Distancia del Currículo Básico Nacional (CBN, 1997)",
    peso: 0.5,
    invertido: true,
    eliminatorio: "E3",
    queEvalua:
      "Señales de alerta: organización por \"contenidos conceptuales/procedimentales/actitudinales\" en vez de competencias con metas medibles; estructura por \"bloques de contenido\" y \"objetivos generales del área\" en vez de núcleos de aprendizaje y perfil de egreso por competencias; los 5 ejes transversales propios del CBN 97 (Lenguaje, Desarrollo del Pensamiento, Valores, Trabajo, Ambiente) como organizador principal, en vez de los pilares y ejes nucleares de VTG; ausencia de evaluación cuantitativa 0–20 combinada con evaluación formativa; evaluación centrada solo en cumplimiento de contenidos por grado.",
  },
];

export const TODOS_LOS_CRITERIOS: CriterioDef[] = [
  ...EJE_A_CRITERIOS,
  ...EJE_B_CRITERIOS,
];

// Anclas de calificación (1-5) para el Eje B — lógica invertida
export const ANCLAS_EJE_B: AnclaPuntaje[] = [
  {
    puntaje: 1,
    significado:
      "Replica casi textualmente el lenguaje, la estructura o el ideario del modelo anterior. → Bloquea el documento (eliminatorio).",
  },
  {
    puntaje: 2,
    significado:
      "Usa varios términos o estructuras características del modelo anterior, aunque no de forma sistemática. → Bloquea el documento (eliminatorio).",
  },
  {
    puntaje: 3,
    significado:
      "Hay rastros puntuales, pero el grueso del documento no depende de ellos.",
  },
  {
    puntaje: 4,
    significado:
      "Prácticamente sin rastros; lenguaje y estructura propios, con alguna coincidencia incidental y no ideológica.",
  },
  { puntaje: 5, significado: "Ruptura total: cero lenguaje, estructura o ideario del modelo anterior." },
];

// ---------------------------------------------------------------------------
// Bandas de color (iguales para ambos ejes y cada criterio individual)
// ---------------------------------------------------------------------------
export function bandaDeColor(puntaje: number): ColorBand {
  if (puntaje < 2.5) return "rojo";
  if (puntaje < 4.0) return "amarillo";
  return "verde";
}

export const COLOR_HEX: Record<ColorBand, string> = {
  rojo: "#CE1126",
  amarillo: "#FCD116",
  verde: "#2E8B57",
};

export const COLOR_LABEL: Record<ColorBand, string> = {
  rojo: "🔴 Rojo",
  amarillo: "🟡 Amarillo",
  verde: "🟢 Verde",
};

// ---------------------------------------------------------------------------
// Puntaje crudo de un criterio, tal como lo entrega el modelo
// ---------------------------------------------------------------------------
export interface CriterioResultado {
  id: string;
  puntaje: number; // 1.0 - 5.0
  justificacion: string;
  citaTextual: string;
}

export interface EjeResultado {
  eje: "A" | "B";
  promedio: number;
  color: ColorBand;
  criterios: (CriterioDef & CriterioResultado & { color: ColorBand })[];
}

export type Dictamen =
  | "bloqueado"
  | "aprobado_con_observaciones"
  | "aprobado";

export interface ReporteCompleto {
  ejeA: EjeResultado;
  ejeB: EjeResultado;
  eliminatoriosDisparados: Eliminatorio[];
  dictamen: Dictamen;
}

export const DICTAMEN_LABEL: Record<Dictamen, string> = {
  bloqueado: "🔴 Bloqueado — requiere revisión de núcleo",
  aprobado_con_observaciones: "🟡 Aprobado con observaciones",
  aprobado: "🟢 Aprobado",
};

/**
 * Calcula el promedio ponderado de un eje a partir de los puntajes crudos.
 * Los eliminatorios siguen contando dentro del promedio normal de su eje.
 */
function calcularEje(
  eje: "A" | "B",
  criteriosDef: CriterioDef[],
  resultados: CriterioResultado[]
): EjeResultado {
  const byId = new Map(resultados.map((r) => [r.id, r]));
  const criterios = criteriosDef.map((def) => {
    const r = byId.get(def.id);
    if (!r) {
      throw new Error(`Falta el puntaje del criterio "${def.id}" (Eje ${eje}).`);
    }
    return { ...def, ...r, color: bandaDeColor(r.puntaje) };
  });
  const promedio = criterios.reduce((sum, c) => sum + c.puntaje * c.peso, 0);
  return {
    eje,
    promedio: Math.round(promedio * 100) / 100,
    color: bandaDeColor(promedio),
    criterios,
  };
}

/**
 * Determina el Dictamen final según la tabla de la rúbrica v3:
 *  - Si cualquiera de E1/E2/E3 está en rojo → Bloqueado, sin importar el resto.
 *  - Si ningún eliminatorio está en rojo, pero Eje A o Eje B están en amarillo
 *    → Aprobado con observaciones.
 *  - Si Eje A y Eje B están ambos en verde y ningún eliminatorio en rojo
 *    → Aprobado.
 */
function calcularDictamen(
  ejeA: EjeResultado,
  ejeB: EjeResultado
): { dictamen: Dictamen; eliminatoriosDisparados: Eliminatorio[] } {
  const eliminatoriosDisparados: Eliminatorio[] = [];
  for (const c of [...ejeA.criterios, ...ejeB.criterios]) {
    if (c.eliminatorio && bandaDeColor(c.puntaje) === "rojo") {
      eliminatoriosDisparados.push(c.eliminatorio);
    }
  }

  if (eliminatoriosDisparados.length > 0) {
    return { dictamen: "bloqueado", eliminatoriosDisparados };
  }
  if (ejeA.color === "amarillo" || ejeB.color === "amarillo") {
    return { dictamen: "aprobado_con_observaciones", eliminatoriosDisparados };
  }
  return { dictamen: "aprobado", eliminatoriosDisparados };
}

/**
 * Punto de entrada principal: toma los puntajes crudos devueltos por el
 * modelo (uno por criterio, con justificación y cita) y calcula en el
 * servidor —nunca confiando en la aritmética del modelo— los promedios de
 * cada eje y el Dictamen final.
 */
export function construirReporte(
  resultadosEjeA: CriterioResultado[],
  resultadosEjeB: CriterioResultado[]
): ReporteCompleto {
  const ejeA = calcularEje("A", EJE_A_CRITERIOS, resultadosEjeA);
  const ejeB = calcularEje("B", EJE_B_CRITERIOS, resultadosEjeB);
  const { dictamen, eliminatoriosDisparados } = calcularDictamen(ejeA, ejeB);
  return { ejeA, ejeB, eliminatoriosDisparados, dictamen };
}
