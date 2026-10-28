import { NextResponse, type NextRequest } from "next/server";
import { urlDeRetorno, validarSolicitud } from "@/lib/mcp/autorizacion";

export async function GET(request: NextRequest) {
  const parametros = request.nextUrl.searchParams;
  const resultado = await validarSolicitud(parametros);

  if (!resultado.ok) {
    if (resultado.redirigir) {
      const { uri, error, state } = resultado.redirigir;
      return NextResponse.redirect(urlDeRetorno(uri, { error, state }), 303);
    }
    return NextResponse.json({ error: "invalid_request", error_description: resultado.mensaje }, { status: 400 });
  }

  const destino = new URL("/autorizar", request.nextUrl.origin);
  for (const nombre of ["client_id", "redirect_uri", "response_type", "code_challenge", "code_challenge_method", "state", "scope"]) {
    const valor = parametros.get(nombre);
    if (valor !== null) destino.searchParams.set(nombre, valor);
  }
  return NextResponse.redirect(destino, 303);
}
