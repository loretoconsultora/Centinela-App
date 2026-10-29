import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  // pdf-parse (pdfjs) carga un archivo de worker desde node_modules; si Next lo
  // empaqueta, no lo encuentra. Se deja como paquete externo del servidor.
  serverExternalPackages: ["pdf-parse", "pdfjs-dist", "@napi-rs/canvas"],
  // Vercel solo sube a la función los archivos que "ve" al rastrear el código.
  // El worker de pdfjs y el motor nativo de canvas se cargan dinámicamente, así
  // que se incluyen a mano en la ruta que lee los PDF.
  outputFileTracingIncludes: {
    "/api/review": [
      "./node_modules/pdfjs-dist/legacy/build/**",
      "./node_modules/pdf-parse/dist/**",
      "./node_modules/@napi-rs/canvas/**",
      "./node_modules/@napi-rs/canvas-linux-x64-gnu/**",
    ],
  },
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
