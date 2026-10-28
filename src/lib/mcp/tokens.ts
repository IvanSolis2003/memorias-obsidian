import { createHash, randomBytes } from "node:crypto";
import { EncryptJWT, jwtDecrypt, jwtVerify, SignJWT } from "jose";
import { requerirVariable } from "../env";

export const DURACION_ACCESS_SEGUNDOS = 60 * 60;
const DURACION_CODIGO_SEGUNDOS = 60;

export type Permiso = "read" | "write";

export type DatosAcceso = {
  grantId: string;
  userId: string;
  scopes: Permiso[];
};

export type DatosCodigo = {
  jti: string;
  userId: string;
  clientId: string;
  redirectUri: string;
  codeChallenge: string;
  scopes: Permiso[];
};

async function clave(proposito: string): Promise<Uint8Array> {
  const bytes = new TextEncoder().encode(`${proposito}:${requerirVariable("MCP_SIGNING_SECRET")}`);
  return new Uint8Array(await crypto.subtle.digest("SHA-256", bytes));
}

export function urlDelRecurso(origen: string) {
  return `${origen}/api/mcp`;
}

export async function firmarAccessToken(datos: DatosAcceso, origen: string) {
  return new SignJWT({ grantId: datos.grantId, scopes: datos.scopes })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(datos.userId)
    .setIssuer(origen)
    .setAudience(urlDelRecurso(origen))
    .setIssuedAt()
    .setExpirationTime(`${DURACION_ACCESS_SEGUNDOS}s`)
    .sign(await clave("acceso"));
}

export async function verificarAccessToken(token: string, origen: string): Promise<DatosAcceso | null> {
  try {
    const { payload } = await jwtVerify(token, await clave("acceso"), {
      issuer: origen,
      audience: urlDelRecurso(origen),
      algorithms: ["HS256"],
    });
    const { grantId, scopes } = payload as { grantId?: unknown; scopes?: unknown };
    if (
      typeof payload.sub !== "string" ||
      typeof grantId !== "string" ||
      !Array.isArray(scopes) ||
      !scopes.every((permiso) => permiso === "read" || permiso === "write")
    ) {
      return null;
    }
    return { grantId, userId: payload.sub, scopes: scopes as Permiso[] };
  } catch {
    return null;
  }
}

export async function cifrarCodigo(datos: Omit<DatosCodigo, "jti">) {
  const jti = randomBytes(16).toString("base64url");
  const codigo = await new EncryptJWT({ ...datos })
    .setProtectedHeader({ alg: "dir", enc: "A256GCM" })
    .setJti(jti)
    .setIssuedAt()
    .setExpirationTime(`${DURACION_CODIGO_SEGUNDOS}s`)
    .encrypt(await clave("codigo"));
  return codigo;
}

export async function descifrarCodigo(codigo: string): Promise<DatosCodigo | null> {
  try {
    const { payload } = await jwtDecrypt(codigo, await clave("codigo"));
    const { userId, clientId, redirectUri, codeChallenge, scopes } = payload as Partial<DatosCodigo>;
    if (
      typeof payload.jti !== "string" ||
      typeof userId !== "string" ||
      typeof clientId !== "string" ||
      typeof redirectUri !== "string" ||
      typeof codeChallenge !== "string" ||
      !Array.isArray(scopes)
    ) {
      return null;
    }
    return { jti: payload.jti, userId, clientId, redirectUri, codeChallenge, scopes };
  } catch {
    return null;
  }
}

export function crearRefreshToken() {
  return randomBytes(32).toString("base64url");
}

export function hashDeRefresh(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function idDeGrantDesdeCodigo(jti: string) {
  return `g_${createHash("sha256").update(jti).digest("base64url").slice(0, 24)}`;
}
