import { createHmac, timingSafeEqual } from "crypto";

// Autenticación simple de esta fase del MVP: una sola contraseña compartida
// por el equipo (CENTINELA_PASSWORD), con una cookie firmada sin estado
// (HMAC) para no necesitar una base de datos de sesiones todavía.
// RBAC completo (roles reales por usuaria vía Supabase Auth) queda para una
// fase posterior — ver "Centinela — Cómo Funciona".

export const PASSWORD_COOKIE = "centinela_auth";

function secreto(): string {
  // Si no se define un secreto aparte, se deriva de la contraseña misma.
  return process.env.CENTINELA_AUTH_SECRET || process.env.CENTINELA_PASSWORD || "centinela-dev-secret";
}

function tokenEsperado(): string {
  return createHmac("sha256", secreto()).update("centinela-sesion-valida").digest("hex");
}

export function emitirCookie(): string {
  return tokenEsperado();
}

export function cookieEsValida(valor: string | undefined | null): boolean {
  if (!valor) return false;
  const esperado = tokenEsperado();
  const a = Buffer.from(valor);
  const b = Buffer.from(esperado);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export function passwordEsCorrecta(password: string): boolean {
  const esperada = process.env.CENTINELA_PASSWORD;
  if (!esperada) return false;
  const a = Buffer.from(password);
  const b = Buffer.from(esperada);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}
