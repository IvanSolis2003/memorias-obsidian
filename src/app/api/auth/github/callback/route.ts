import { NextResponse, type NextRequest } from "next/server";
import {
  canjearCodigo,
  cifrarSesion,
  COOKIE_ESTADO,
  COOKIE_SESION,
  COOKIE_VOLVER,
  destinoVolverValido,
  opcionesCookieSesion,
} from "@/lib/auth";
import { registrarUsuario } from "@/lib/db";
import { usuarioPermitido } from "@/lib/env";
import { obtenerUsuarioGithub } from "@/lib/github";

function volverALogin(request: NextRequest, error: string) {
  const respuesta = NextResponse.redirect(new URL(`/login?error=${error}`, request.nextUrl.origin));
  respuesta.cookies.delete(COOKIE_ESTADO);
  return respuesta;
}

export async function GET(request: NextRequest) {
  const codigo = request.nextUrl.searchParams.get("code");
  const estado = request.nextUrl.searchParams.get("state");
  const estadoGuardado = request.cookies.get(COOKIE_ESTADO)?.value;

  if (!codigo || !estado || !estadoGuardado || estado !== estadoGuardado) {
    return volverALogin(request, "estado_invalido");
  }

  const tokens = await canjearCodigo(
    codigo,
    `${request.nextUrl.origin}/api/auth/github/callback`,
  );
  if (!tokens) return volverALogin(request, "github");

  let usuario;
  try {
    usuario = await obtenerUsuarioGithub(tokens.accessToken);
  } catch {
    return volverALogin(request, "github");
  }

  if (!usuarioPermitido(usuario.login)) {
    return volverALogin(request, "no_autorizado");
  }

  let registro;
  try {
    registro = await registrarUsuario({
      githubId: usuario.id,
      login: usuario.login,
      nombre: usuario.name,
      avatarUrl: usuario.avatar_url,
    });
  } catch {
    return volverALogin(request, "servidor");
  }

  const sesion = await cifrarSesion({
    ...tokens,
    userId: registro.id,
    githubId: usuario.id,
    login: usuario.login,
  });
  const volver = request.cookies.get(COOKIE_VOLVER)?.value;
  const destino = destinoVolverValido(volver) ? volver : "/";
  const respuesta = NextResponse.redirect(new URL(destino, request.nextUrl.origin));
  respuesta.cookies.delete(COOKIE_ESTADO);
  respuesta.cookies.delete(COOKIE_VOLVER);
  respuesta.cookies.set(COOKIE_SESION, sesion, opcionesCookieSesion());
  return respuesta;
}
