import type { ReporteAPI } from "@/lib/types";
import { DictamenBanner } from "./DictamenBanner";
import { EjeSection } from "./EjeSection";

function Bloque({ titulo, texto }: { titulo: string; texto: string }) {
  return (
    <div>
      <h3 className="text-sm font-semibold text-foreground">{titulo}</h3>
      <p className="mt-1 text-sm leading-relaxed text-foreground-muted whitespace-pre-line">
        {texto}
      </p>
    </div>
  );
}

// Reporte completo de una revisión: dictamen, lectura de conjunto, y el
// detalle de cada criterio de los dos ejes. Lo usan la pantalla de revisión
// y el detalle dentro de Gestión de documentos.
export function ReporteView({ reporte }: { reporte: ReporteAPI }) {
  const hayNarrativa =
    reporte.explicacionDictamen || reporte.hallazgoPrincipal || reporte.recomendacion;
  return (
    <div className="flex flex-col gap-6">
      {reporte.advertenciaExtraccion && (
        <p className="text-sm text-[#8a6d00] bg-amarillo/10 rounded-[10px] px-3 py-2">
          {reporte.advertenciaExtraccion}
        </p>
      )}

      <DictamenBanner
        dictamen={reporte.dictamen}
        eliminatoriosDisparados={reporte.eliminatoriosDisparados}
      />

      {hayNarrativa && (
        <section className="card card-lg p-6 sm:p-8 flex flex-col gap-5">
          {reporte.explicacionDictamen && (
            <Bloque titulo="Por qué quedó así" texto={reporte.explicacionDictamen} />
          )}
          {reporte.hallazgoPrincipal && (
            <Bloque titulo="Hallazgo principal" texto={reporte.hallazgoPrincipal} />
          )}
          {reporte.recomendacion && (
            <Bloque titulo="Recomendación para la autora" texto={reporte.recomendacion} />
          )}
        </section>
      )}

      <EjeSection
        titulo="Eje A — Alineación con VTG"
        subtitulo="¿Qué tan alineado está el documento con el modelo que estamos construyendo?"
        eje={reporte.ejeA}
      />
      <EjeSection
        titulo="Eje B — Distancia del modelo anterior"
        subtitulo="¿Qué tan lejos está del currículo bolivariano (2007) y del currículo de 1997? Más parecido = peor."
        eje={reporte.ejeB}
      />
    </div>
  );
}

export function BotonPdf({ documentoId, vista }: { documentoId: string; vista: string }) {
  return (
    <a
      href={`/api/documentos/${documentoId}/pdf?vista=${encodeURIComponent(vista)}`}
      download
      className="inline-flex items-center gap-2 rounded-[10px] border border-border-strong bg-white px-4 py-2 text-sm font-medium text-foreground hover:bg-surface transition"
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M12 3v12m0 0l-4-4m4 4l4-4M4 17v2a2 2 0 002 2h12a2 2 0 002-2v-2" />
      </svg>
      Descargar PDF
    </a>
  );
}
