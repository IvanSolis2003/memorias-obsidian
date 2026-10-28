import type { NextRequest } from "next/server";

const MAX_CLAVES = 2000;

const intentos = new Map<string, number[]>();

export type ReglaLimite = { maximo: number; ventanaMs: number };

export const REGLAS_LIMITE: Record<string, ReglaLimite> = {
  "/api/auth/github/login": { maximo: 20, ventanaMs: 10 * 60 * 1000 },
  "/api/auth/github/callback": { maximo: 30, ventanaMs: 10 * 60 * 1000 },
  "/api/oauth/authorize": { maximo: 30, ventanaMs: 10 * 60 * 1000 },
  "/api/oauth/register": { maximo: 20, ventanaMs: 60 * 60 * 1000 },
  "/api/oauth/token": { maximo: 60, ventanaMs: 10 * 60 * 1000 },
};

function podar(ahora: number) {
  for (const [clave, marcas] of intentos) {
    const vigentes = marcas.filter((marca) => ahora - marca < 60 * 60 * 1000);
    if (vigentes.length === 0) intentos.delete(clave);
    else intentos.set(clave, vigentes);
  }
}

export function ipDe(request: NextRequest) {
  const reenviada = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return reenviada || request.headers.get("x-real-ip") || "desconocida";
}

export function superaLimite(clave: string, regla: ReglaLimite, ahora = Date.now()) {
  const recientes = (intentos.get(clave) ?? []).filter((marca) => ahora - marca < regla.ventanaMs);
  recientes.push(ahora);
  intentos.set(clave, recientes);
  if (intentos.size > MAX_CLAVES) podar(ahora);
  return recientes.length > regla.maximo;
}
