import { NextResponse, type NextRequest } from "next/server";
import { marcarLecturaCorrecta } from "@/lib/db";
import { respuestaDeError } from "@/lib/errores";
import { obtenerArbol, obtenerRama } from "@/lib/github";
import { requerirSesion } from "@/lib/sesion";
import { vaultDeLaSesion } from "@/lib/vault/acceso";
import { filtrarArchivos } from "@/lib/vault/rutas";

export async function GET(request: NextRequest) {
  try {
    const sesion = await requerirSesion();
    const vault = await vaultDeLaSesion(sesion.userId);
    const rama = await obtenerRama(
      sesion.accessToken,
      vault.owner,
      vault.repo,
      vault.branch,
      request.headers.get("if-none-match"),
    );
    if (!rama.cambiado) {
      await marcarLecturaCorrecta(sesion.userId).catch(() => null);
      return new NextResponse(null, { status: 304, headers: { "Cache-Control": "private, no-cache" } });
    }

    const commitSha = rama.datos.object.sha;
    const arbol = await obtenerArbol(sesion.accessToken, vault.owner, vault.repo, commitSha);
    await marcarLecturaCorrecta(sesion.userId).catch(() => null);
    const respuesta = NextResponse.json({
      commitSha,
      archivos: filtrarArchivos(arbol.tree, vault.basePath),
      truncado: arbol.truncated,
    });
    respuesta.headers.set("Cache-Control", "private, no-cache");
    respuesta.headers.set("Vary", "Cookie");
    if (rama.etag) respuesta.headers.set("ETag", rama.etag);
    return respuesta;
  } catch (error) {
    return respuestaDeError(error);
  }
}
