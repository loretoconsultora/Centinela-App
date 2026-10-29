import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Centinela - App de Revisión Interna",
  description:
    "Centinela — herramienta de revisión de alineación curricular para Venezuela Tierra de Gracia.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-background text-foreground">
        {children}
      </body>
    </html>
  );
}
