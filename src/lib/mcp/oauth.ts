import { createHash, timingSafeEqual } from "node:crypto";
import type { Permiso } from "./tokens";

const REDIRECTS_POR_DEFECTO = [
  "https://claude.ai/api/mcp/auth_callback",
  "https://claude.com/api/mcp/auth_callback",
  "http://localhost/callback",
  "http://127.0.0.1/callback",
];

const FORMATO_VERIFICADOR = /^[A-Za-z0-9\-._~]{43,128}$/;
const FORMATO_CHALLENGE = /^[A-Za-z0-9\-_]{43}$/;

function permitidas() {
  const configuradas = (process.env.MCP_ALLOWED_REDIRECT_URIS ?? "")
    .split(",")
    .map((uri) => uri.trim())
    .filter(Boolean);
  return configuradas.length > 0 ? configuradas : REDIRECTS_POR_DEFECTO;
}

function analizar(uri: string) {
  try {
    return new URL(uri);
  } catch {
    return null;
  }
}

function esLoopback(url: URL) {
  return url.protocol === "http:" && (url.hostname === "localhost" || url.hostname === "127.0.0.1");
}

function coincide(candidata: string, referencia: string) {
  if (candidata === referencia) return true;
  const a = analizar(candidata);
  const b = analizar(referencia);
  if (!a || !b || !esLoopback(a) || !esLoopback(b)) return false;
  return a.hostname === b.hostname && a.pathname === b.pathname && !a.search && !a.hash;
}

export function redirectPermitida(uri: string) {
  const url = analizar(uri);
  if (!url || url.hash || (url.protocol !== "https:" && !esLoopback(url))) return false;
  return permitidas().some((permitida) => coincide(uri, permitida));
}

export function redirectRegistrada(registradas: string[], uri: string) {
  return redirectPermitida(uri) && registradas.some((registrada) => coincide(uri, registrada));
}

export function verificarPkce(verificador: string, challenge: string) {
  if (!FORMATO_VERIFICADOR.test(verificador) || !FORMATO_CHALLENGE.test(challenge)) return false;
  const calculado = Buffer.from(createHash("sha256").update(verificador).digest("base64url"));
  const esperado = Buffer.from(challenge);
  return calculado.length === esperado.length && timingSafeEqual(calculado, esperado);
}

export function challengeValido(challenge: unknown, metodo: unknown) {
  return typeof challenge === "string" && FORMATO_CHALLENGE.test(challenge) && metodo === "S256";
}

export function permisosSolicitados(scope: string | null | undefined): Permiso[] {
  const pedidos = (scope ?? "").split(/\s+/);
  const permisos: Permiso[] = ["read"];
  if (pedidos.includes("write")) permisos.push("write");
  return permisos;
}

export function nombreDeCliente(valor: unknown) {
  const limpio = typeof valor === "string" ? valor.replace(/[\u0000-\u001f<>]/g, "").trim() : "";
  return limpio.slice(0, 80) || "Cliente MCP";
}

export function hostDeRedirect(uri: string) {
  return analizar(uri)?.host ?? uri;
}
