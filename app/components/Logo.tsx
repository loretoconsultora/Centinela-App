import Image from "next/image";

// Marca de Centinela: documento con lupa (revisión de contenidos), en el rojo
// de la bandera. El archivo vive en public/logo.png (versión negra: logo-negro.png).

export function Logo({ size = 40 }: { size?: number }) {
  return (
    <Image
      src="/logo.png"
      alt="Centinela"
      width={size}
      height={size}
      priority
      className="select-none"
    />
  );
}

export function Wordmark({ className = "" }: { className?: string }) {
  return (
    <span className={`font-semibold tracking-tight ${className}`}>
      Centinela
    </span>
  );
}
