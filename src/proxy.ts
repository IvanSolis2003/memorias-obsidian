import { NextResponse, type NextRequest } from "next/server";
import {
  cifrarSesion,
  COOKIE_SESION,
  descifrarSesion,
  opcionesCookieSesion,
  renovarSesion,
  sesionVigente,
} from "@/lib/auth";
import { ipDe, REGLAS_LIMITE, superaLimite } from "@/lib/limite";

const RUTAS_OAUTH_PUBLICAS = ["/api/oauth/register", "/api/oauth/authorize", "/api/oauth/token"];
const RUTAS_SIN_VERIFICAR_ORIGEN = ["/api/mcp", "/api/oauth/register", "/api/oauth/token"];
const METODOS_SEGUROS = ["GET", "HEAD", "OPTIONS"];

function esPublica(ruta: string) {
  return (
    ruta === "/login" ||
    ruta === "/privacidad" ||
    ruta.startsWith("/api/auth/") ||
    ruta === "/api/mcp" ||
    ruta.startsWith("/.well-known/") ||
    RUTAS_OAUTH_PUBLICAS.includes(ruta)
  );
}

function politicaDeContenido(nonce: string) {
  const desarrollo = process.env.NODE_ENV === "development";
  return [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${desarrollo ? " 'unsafe-eval'" : ""}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' blob: data:",
    "media-src 'self' blob:",
    "font-src 'self' data:",
    "connect-src 'self'",
    "frame-src 'self'",
    "object-src 'none'",
    "worker-src 'self'",
    "manifest-src 'self'",
    "base-uri 'self'",
    "frame-ancestors 'none'",
  ].join("; ");
}

function continuar(request: NextRequest) {
  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const politica = politicaDeContenido(nonce);
  const cabeceras = new Headers(request.headers);
  cabeceras.set("x-nonce", nonce);
  cabeceras.set("Content-Security-Policy", politica);
  const respuesta = NextResponse.next({ request: { headers: cabeceras } });
  respuesta.headers.set("Content-Security-Policy", politica);
  return respuesta;
}

function origenInvalido(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (
    METODOS_SEGUROS.includes(request.method) ||
    !pathname.startsWith("/api/") ||
    RUTAS_SIN_VERIFICAR_ORIGEN.includes(pathname)
  ) {
    return false;
  }
  const origen = request.headers.get("origin");
  if (origen) return origen !== request.nextUrl.origin;
  const sitio = request.headers.get("sec-fetch-site");
  return sitio !== "same-origin" && sitio !== "none";
}

function limiteExcedido(request: NextRequest) {
  const regla = REGLAS_LIMITE[request.nextUrl.pathname];
  if (!regla) return null;
  if (!superaLimite(`${request.nextUrl.pathname}|${ipDe(request)}`, regla)) return null;
  return NextResponse.json(
    { error: "Demasiados intentos. Espera unos minutos y vuelve a intentar." },
    { status: 429, headers: { "Retry-After": String(Math.ceil(regla.ventanaMs / 1000)) } },
  );
}

function rechazar(request: NextRequest, error?: string) {
  const destinoLogin = new URL("/login", request.nextUrl.origin);
  if (error) destinoLogin.searchParams.set("error", error);
  if (request.nextUrl.pathname === "/autorizar") {
    destinoLogin.searchParams.set("volver", request.nextUrl.pathname + request.nextUrl.search);
  }
  const respuesta = request.nextUrl.pathname.startsWith("/api/")
    ? NextResponse.json({ error: "No autenticado" }, { status: 401 })
    : NextResponse.redirect(destinoLogin);
  respuesta.cookies.delete(COOKIE_SESION);
  return respuesta;
}

export async function proxy(request: NextRequest) {
  const excedido = limiteExcedido(request);
  if (excedido) return excedido;
  if (origenInvalido(request)) {
    return NextResponse.json({ error: "Origen no permitido." }, { status: 403 });
  }
  if (esPublica(request.nextUrl.pathname)) return continuar(request);

  const sesion = await descifrarSesion(request.cookies.get(COOKIE_SESION)?.value);
  if (!sesion) return rechazar(request);
  if (sesionVigente(sesion)) return continuar(request);

  const renovada = await renovarSesion(sesion);
  if (!renovada) return rechazar(request, "sesion_expirada");

  const valor = await cifrarSesion(renovada);
  request.cookies.set(COOKIE_SESION, valor);
  const respuesta = continuar(request);
  respuesta.cookies.set(COOKIE_SESION, valor, opcionesCookieSesion());
  return respuesta;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon\\.ico|manifest\\.webmanifest|sw\\.js|icons/|apple-touch-icon\\.png).*)",
  ],
};
