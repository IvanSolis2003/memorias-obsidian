import { randomBytes } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { COOKIE_ESTADO, COOKIE_VOLVER, destinoVolverValido, opcionesCookieEstado } from "@/lib/auth";
import { requerirVariable } from "@/lib/env";

export function GET(request: NextRequest) {
  const estado = randomBytes(32).toString("base64url");
  const destino = new URL("https://github.com/login/oauth/authorize");
  destino.searchParams.set("client_id", requerirVariable("GITHUB_APP_CLIENT_ID"));
  destino.searchParams.set(
    "redirect_uri",
    `${request.nextUrl.origin}/api/auth/github/callback`,
  );
  destino.searchParams.set("state", estado);

  const respuesta = NextResponse.redirect(destino);
  respuesta.cookies.set(COOKIE_ESTADO, estado, opcionesCookieEstado());
  const volver = request.nextUrl.searchParams.get("volver");
  if (destinoVolverValido(volver)) {
    respuesta.cookies.set(COOKIE_VOLVER, volver, opcionesCookieEstado());
  } else {
    respuesta.cookies.delete(COOKIE_VOLVER);
  }
  return respuesta;
}
