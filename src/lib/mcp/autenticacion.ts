import { NextResponse, type NextRequest } from "next/server";
import { marcarUsoGrant, obtenerGrant } from "../db";
import { firmaConfigurada } from "./configuracion";
import type { ContextoMcp } from "./herramientas";
import { verificarAccessToken } from "./tokens";

export function respuestaNoAutorizada(origen: string, conToken: boolean) {
  const parametros = [`resource_metadata="${origen}/.well-known/oauth-protected-resource"`];
  if (conToken) parametros.push('error="invalid_token"');
  return NextResponse.json(
    { error: conToken ? "invalid_token" : "unauthorized" },
    { status: 401, headers: { "WWW-Authenticate": `Bearer ${parametros.join(", ")}` } },
  );
}

export async function autenticarMcp(request: NextRequest): Promise<ContextoMcp | NextResponse> {
  if (!firmaConfigurada()) return NextResponse.json({ error: "server_error" }, { status: 503 });
  const origen = request.nextUrl.origin;
  const cabecera = request.headers.get("authorization") ?? "";
  const coincidencia = /^Bearer\s+(\S+)$/i.exec(cabecera);
  if (!coincidencia) return respuestaNoAutorizada(origen, false);

  const datos = await verificarAccessToken(coincidencia[1], origen);
  if (!datos) return respuestaNoAutorizada(origen, true);

  const grant = await obtenerGrant(datos.grantId);
  if (!grant || grant.revokedAt || grant.userId !== datos.userId) {
    return respuestaNoAutorizada(origen, true);
  }
  await marcarUsoGrant(grant.id).catch(() => null);

  const scopes = datos.scopes.filter((permiso) => grant.scopes.includes(permiso));
  return { userId: grant.userId, grantId: grant.id, scopes };
}
