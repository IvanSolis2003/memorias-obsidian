import { EncryptJWT, jwtDecrypt } from "jose";
import { requerirVariable } from "./env";

export const COOKIE_SESION = "memorias_sesion";
export const COOKIE_ESTADO = "memorias_oauth_estado";
export const COOKIE_VOLVER = "memorias_volver";

const DURACION_SESION_SEGUNDOS = 60 * 60 * 24 * 30;
const DURACION_ESTADO_SEGUNDOS = 60 * 10;
const MARGEN_RENOVACION_MS = 60 * 1000;
const URL_TOKENS_GITHUB = "https://github.com/login/oauth/access_token";

type TokensGithub = {
  accessToken: string;
  accessTokenExpiraEn: number;
  refreshToken: string;
  refreshTokenExpiraEn: number;
};

export type Sesion = TokensGithub & {
  userId: string;
  githubId: number;
  login: string;
};

type RespuestaTokens = {
  access_token?: string;
  expires_in?: number;
  refresh_token?: string;
  refresh_token_expires_in?: number;
};

const renovacionesEnCurso = new Map<string, Promise<Sesion | null>>();

async function claveDeSesion(): Promise<Uint8Array> {
  const bytes = new TextEncoder().encode(requerirVariable("AUTH_SECRET"));
  return new Uint8Array(await crypto.subtle.digest("SHA-256", bytes));
}

export function destinoVolverValido(valor: string | null | undefined): valor is string {
  return typeof valor === "string" && valor.length < 2000 && /^\/autorizar(\?|$)/.test(valor);
}

export function opcionesCookieSesion() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: DURACION_SESION_SEGUNDOS,
  };
}

export function opcionesCookieEstado() {
  return { ...opcionesCookieSesion(), maxAge: DURACION_ESTADO_SEGUNDOS };
}

export async function cifrarSesion(sesion: Sesion): Promise<string> {
  return new EncryptJWT({ ...sesion })
    .setProtectedHeader({ alg: "dir", enc: "A256GCM" })
    .setIssuedAt()
    .setExpirationTime(`${DURACION_SESION_SEGUNDOS}s`)
    .encrypt(await claveDeSesion());
}

function esSesion(datos: Record<string, unknown>): datos is Sesion {
  return (
    typeof datos.userId === "string" &&
    typeof datos.githubId === "number" &&
    typeof datos.login === "string" &&
    typeof datos.accessToken === "string" &&
    typeof datos.accessTokenExpiraEn === "number" &&
    typeof datos.refreshToken === "string" &&
    typeof datos.refreshTokenExpiraEn === "number"
  );
}

export async function descifrarSesion(valor: string | undefined): Promise<Sesion | null> {
  if (!valor) return null;
  try {
    const { payload } = await jwtDecrypt(valor, await claveDeSesion());
    return esSesion(payload) ? payload : null;
  } catch {
    return null;
  }
}

export function sesionVigente(sesion: Sesion): boolean {
  return sesion.accessTokenExpiraEn - MARGEN_RENOVACION_MS > Date.now();
}

async function pedirTokens(parametros: Record<string, string>): Promise<TokensGithub | null> {
  const respuesta = await fetch(URL_TOKENS_GITHUB, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      client_id: requerirVariable("GITHUB_APP_CLIENT_ID"),
      client_secret: requerirVariable("GITHUB_APP_CLIENT_SECRET"),
      ...parametros,
    }),
    cache: "no-store",
  });
  if (!respuesta.ok) return null;
  const datos: RespuestaTokens = await respuesta.json();
  if (
    !datos.access_token ||
    !datos.refresh_token ||
    !datos.expires_in ||
    !datos.refresh_token_expires_in
  ) {
    return null;
  }
  const ahora = Date.now();
  return {
    accessToken: datos.access_token,
    accessTokenExpiraEn: ahora + datos.expires_in * 1000,
    refreshToken: datos.refresh_token,
    refreshTokenExpiraEn: ahora + datos.refresh_token_expires_in * 1000,
  };
}

export function canjearCodigo(codigo: string, redirectUri: string) {
  return pedirTokens({ code: codigo, redirect_uri: redirectUri });
}

async function renovarTokens(sesion: Sesion): Promise<Sesion | null> {
  if (sesion.refreshTokenExpiraEn <= Date.now()) return null;
  const tokens = await pedirTokens({
    grant_type: "refresh_token",
    refresh_token: sesion.refreshToken,
  });
  return tokens ? { ...sesion, ...tokens } : null;
}

export function renovarSesion(sesion: Sesion): Promise<Sesion | null> {
  const enCurso = renovacionesEnCurso.get(sesion.refreshToken);
  if (enCurso) return enCurso;
  const renovacion = renovarTokens(sesion).finally(() => {
    renovacionesEnCurso.delete(sesion.refreshToken);
  });
  renovacionesEnCurso.set(sesion.refreshToken, renovacion);
  return renovacion;
}
