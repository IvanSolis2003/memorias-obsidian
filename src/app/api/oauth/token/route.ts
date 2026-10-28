import { NextResponse, type NextRequest } from "next/server";
import {
  crearGrant,
  obtenerClienteMcp,
  obtenerGrantPorRefresh,
  registrarAuditoria,
  rotarRefreshGrant,
} from "@/lib/db";
import { firmaConfigurada } from "@/lib/mcp/configuracion";
import { verificarPkce } from "@/lib/mcp/oauth";
import {
  crearRefreshToken,
  descifrarCodigo,
  DURACION_ACCESS_SEGUNDOS,
  firmarAccessToken,
  hashDeRefresh,
  idDeGrantDesdeCodigo,
  type Permiso,
} from "@/lib/mcp/tokens";

const CABECERAS = { "Cache-Control": "no-store", Pragma: "no-cache" };

function error(codigo: string, estado = 400) {
  return NextResponse.json({ error: codigo }, { status: estado, headers: CABECERAS });
}

async function emitir(origen: string, grantId: string, userId: string, scopes: Permiso[], refresh: string) {
  return NextResponse.json(
    {
      access_token: await firmarAccessToken({ grantId, userId, scopes }, origen),
      token_type: "Bearer",
      expires_in: DURACION_ACCESS_SEGUNDOS,
      refresh_token: refresh,
      scope: scopes.join(" "),
    },
    { headers: CABECERAS },
  );
}

function esChoqueDeUnicidad(e: unknown) {
  return typeof e === "object" && e !== null && (e as { code?: string }).code === "P2002";
}

async function canjearCodigo(origen: string, formulario: FormData) {
  const codigo = formulario.get("code");
  const redirectUri = formulario.get("redirect_uri");
  const clientId = formulario.get("client_id");
  const verificador = formulario.get("code_verifier");
  if (
    typeof codigo !== "string" ||
    typeof redirectUri !== "string" ||
    typeof clientId !== "string" ||
    typeof verificador !== "string"
  ) {
    return error("invalid_request");
  }

  const datos = await descifrarCodigo(codigo);
  if (
    !datos ||
    datos.clientId !== clientId ||
    datos.redirectUri !== redirectUri ||
    !verificarPkce(verificador, datos.codeChallenge)
  ) {
    return error("invalid_grant");
  }
  const cliente = await obtenerClienteMcp(clientId);
  if (!cliente) return error("invalid_client", 401);

  const refresh = crearRefreshToken();
  const grantId = idDeGrantDesdeCodigo(datos.jti);
  try {
    await crearGrant({
      id: grantId,
      userId: datos.userId,
      clientId,
      scopes: datos.scopes,
      refreshTokenHash: hashDeRefresh(refresh),
    });
  } catch (e) {
    if (esChoqueDeUnicidad(e)) return error("invalid_grant");
    throw e;
  }
  await registrarAuditoria(datos.userId, "claude", "conectar", cliente.nombre).catch(() => null);
  return emitir(origen, grantId, datos.userId, datos.scopes, refresh);
}

async function renovar(origen: string, formulario: FormData) {
  const token = formulario.get("refresh_token");
  const clientId = formulario.get("client_id");
  if (typeof token !== "string" || typeof clientId !== "string") return error("invalid_request");

  const hashActual = hashDeRefresh(token);
  const grant = await obtenerGrantPorRefresh(hashActual);
  if (!grant || grant.revokedAt || grant.clientId !== clientId) return error("invalid_grant");

  const nuevo = crearRefreshToken();
  if (!(await rotarRefreshGrant(grant.id, hashActual, hashDeRefresh(nuevo)))) {
    return error("invalid_grant");
  }
  return emitir(origen, grant.id, grant.userId, grant.scopes as Permiso[], nuevo);
}

export async function POST(request: NextRequest) {
  if (!firmaConfigurada()) return error("server_error", 503);
  const formulario = await request.formData().catch(() => null);
  if (!formulario) return error("invalid_request");
  const origen = request.nextUrl.origin;

  const tipo = formulario.get("grant_type");
  if (tipo === "authorization_code") return canjearCodigo(origen, formulario);
  if (tipo === "refresh_token") return renovar(origen, formulario);
  return error("unsupported_grant_type");
}
