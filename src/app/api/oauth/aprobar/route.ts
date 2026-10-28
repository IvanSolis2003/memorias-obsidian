import { NextResponse, type NextRequest } from "next/server";
import { obtenerVault } from "@/lib/db";
import { usuarioPermitido } from "@/lib/env";
import { obtenerSesion } from "@/lib/sesion";
import { urlDeRetorno, validarSolicitud } from "@/lib/mcp/autorizacion";
import { cifrarCodigo, type Permiso } from "@/lib/mcp/tokens";

function rechazo(mensaje: string, estado: number) {
  return NextResponse.json({ error: mensaje }, { status: estado });
}

export async function POST(request: NextRequest) {
  if (request.headers.get("origin") !== request.nextUrl.origin) {
    return rechazo("Origen no permitido.", 403);
  }
  const sesion = await obtenerSesion();
  if (!sesion || !usuarioPermitido(sesion.login)) return rechazo("No autenticado.", 401);

  const formulario = await request.formData().catch(() => null);
  if (!formulario) return rechazo("Solicitud no válida.", 400);
  const resultado = await validarSolicitud(formulario);
  if (!resultado.ok) return rechazo(resultado.mensaje, 400);
  const { solicitud } = resultado;

  if (formulario.get("decision") !== "aprobar") {
    return NextResponse.redirect(
      urlDeRetorno(solicitud.redirectUri, { error: "access_denied", state: solicitud.state }),
      303,
    );
  }
  if (!(await obtenerVault(sesion.userId))) {
    return rechazo("Primero conecta tu vault en Conexiones.", 409);
  }

  const scopes: Permiso[] = formulario.get("permiso") === "write" ? ["read", "write"] : ["read"];
  const codigo = await cifrarCodigo({
    userId: sesion.userId,
    clientId: solicitud.clientId,
    redirectUri: solicitud.redirectUri,
    codeChallenge: solicitud.codeChallenge,
    scopes,
  });
  return NextResponse.redirect(
    urlDeRetorno(solicitud.redirectUri, { code: codigo, state: solicitud.state }),
    303,
  );
}
