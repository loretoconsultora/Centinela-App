// Marca geométrica de Centinela: una torre/atalaya minimalista construida con
// formas simples, usando los tres acentos de la bandera de Venezuela. Sin
// textura ni degradados — estilo plano, al estilo de un ícono de app.

export function Logo({ size = 40 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="Centinela"
      role="img"
    >
      <rect width="64" height="64" rx="16" fill="#ffffff" stroke="#e5e5ea" />
      {/* Base: triángulo (torre de vigía) */}
      <path d="M32 14 L46 46 H18 Z" fill="#00247D" />
      {/* Anillo de alerta (amarillo) */}
      <circle cx="32" cy="30" r="7" fill="#FCD116" />
      {/* Punto de enfoque (rojo) */}
      <circle cx="32" cy="30" r="2.6" fill="#CF142B" />
    </svg>
  );
}

export function Wordmark({ className = "" }: { className?: string }) {
  return (
    <span className={`font-semibold tracking-tight ${className}`}>
      Centinela
    </span>
  );
}
