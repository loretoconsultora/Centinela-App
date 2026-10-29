import { NextResponse, type NextRequest } from "next/server";
import { PASSWORD_COOKIE, cookieEsValida } from "@/lib/auth";

// Next.js 16 renombró "middleware.ts" a "proxy.ts" (misma funcionalidad,
// nombre de archivo y de función distintos). Esta es la puerta de entrada
// con contraseña única del MVP de Centinela: todo lo que no sea /login o
// las rutas de autenticación/estáticos requiere la cookie de sesión.

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (
    pathname.startsWith("/login") ||
    pathname.startsWith("/api/login") ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon")
  ) {
    return NextResponse.next();
  }

  const cookie = request.cookies.get(PASSWORD_COOKIE)?.value;
  if (!cookieEsValida(cookie)) {
    // Las rutas de API devuelven un 401 en JSON en vez de redirigir, para
    // que un fetch() desde el cliente pueda manejarlo sin romperse al
    // intentar parsear una página de login como JSON.
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "No autenticado." }, { status: 401 });
    }
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("from", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
