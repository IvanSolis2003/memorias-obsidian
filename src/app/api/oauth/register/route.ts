import { randomBytes } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { registrarClienteMcp } from "@/lib/db";
import { nombreDeCliente, redirectPermitida } from "@/lib/mcp/oauth";

const MAX_REDIRECTS = 5;

function rechazo(descripcion: string) {
  return NextResponse.json(
    { error: "invalid_client_metadata", error_description: descripcion },
    { status: 400 },
  );
}

export async function POST(request: NextRequest) {
  const cuerpo = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  const redirectUris = cuerpo?.redirect_uris;
  if (
    !Array.isArray(redirectUris) ||
    redirectUris.length === 0 ||
    redirectUris.length > MAX_REDIRECTS ||
    !redirectUris.every((uri): uri is string => typeof uri === "string")
  ) {
    return rechazo("redirect_uris debe ser una lista de 1 a 5 direcciones.");
  }
  if (!redirectUris.every(redirectPermitida)) {
    return rechazo("Alguna redirect_uri no está permitida para este servidor.");
  }

  const id = `mcp_${randomBytes(16).toString("base64url")}`;
  const nombre = nombreDeCliente(cuerpo?.client_name);
  await registrarClienteMcp({ id, nombre, redirectUris });

  return NextResponse.json(
    {
      client_id: id,
      client_name: nombre,
      redirect_uris: redirectUris,
      token_endpoint_auth_method: "none",
      grant_types: ["authorization_code", "refresh_token"],
      response_types: ["code"],
      client_id_issued_at: Math.floor(Date.now() / 1000),
    },
    { status: 201, headers: { "Cache-Control": "no-store" } },
  );
}
