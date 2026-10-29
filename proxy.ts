import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Next.js 16 renombró "middleware.ts" a "proxy.ts". Aquí se refresca la
// sesión de Supabase en cada petición y se deja pasar solo a quien haya
// iniciado sesión. Los permisos por rol NO se deciden aquí (solo se sabe si
// hay sesión): cada ruta de API los verifica contra el perfil en Supabase.

export async function proxy(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const clave = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !clave) {
    return new NextResponse(
      "Centinela: faltan las variables NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY en Vercel.",
      { status: 503 }
    );
  }

  let response = NextResponse.next({ request });

  const supabase = createServerClient(url, clave, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options)
        );
        Object.entries(headers ?? {}).forEach(([k, v]) => response.headers.set(k, v));
      },
    },
  });

  const { data } = await supabase.auth.getClaims();
  const hayRastroDeSesion = !!data?.claims;
  const { pathname } = request.nextUrl;
  const esLogin = pathname === "/login";

  const conCookiesDeSesion = (r: NextResponse) => {
    response.cookies.getAll().forEach((c) => r.cookies.set(c));
    return r;
  };

  if (!hayRastroDeSesion && !esLogin) {
    if (pathname.startsWith("/api/")) {
      return conCookiesDeSesion(
        NextResponse.json({ error: "No autenticado." }, { status: 401 })
      );
    }
    const destino = request.nextUrl.clone();
    destino.pathname = "/login";
    destino.search = "";
    if (pathname !== "/") destino.searchParams.set("from", pathname);
    return conCookiesDeSesion(NextResponse.redirect(destino));
  }

  if (hayRastroDeSesion && esLogin) {
    const destino = request.nextUrl.clone();
    destino.pathname = "/";
    destino.search = "";
    return conCookiesDeSesion(NextResponse.redirect(destino));
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
