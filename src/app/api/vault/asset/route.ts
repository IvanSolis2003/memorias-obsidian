import { type NextRequest } from "next/server";
import { ErrorApi, respuestaDeError } from "@/lib/errores";
import { descargarArchivo } from "@/lib/github";
import { requerirSesion } from "@/lib/sesion";
import { rutaEnRepositorio, vaultDeLaSesion } from "@/lib/vault/acceso";
import { validarRuta } from "@/lib/vault/rutas";
import { extensionDe, tipoDeArchivo } from "@/lib/vault/tiposArchivo";

function leerRango(cabecera: string | null, total: number) {
  if (!cabecera) return null;
  const coincidencia = /^bytes=(\d*)-(\d*)$/.exec(cabecera);
  if (!coincidencia || (!coincidencia[1] && !coincidencia[2])) {
    throw new ErrorApi(416, "El rango pedido no es válido.");
  }
  const inicio = coincidencia[1]
    ? Number(coincidencia[1])
    : Math.max(total - Number(coincidencia[2]), 0);
  const fin = coincidencia[1] && coincidencia[2] ? Number(coincidencia[2]) : total - 1;
  if (inicio >= total || inicio > fin) throw new ErrorApi(416, "El rango pedido no es válido.");
  return { inicio, fin: Math.min(fin, total - 1) };
}

export async function GET(request: NextRequest) {
  try {
    const sesion = await requerirSesion();
    const ruta = validarRuta(request.nextUrl.searchParams.get("ruta"));
    const tipo = tipoDeArchivo(ruta);
    if (!tipo) throw new ErrorApi(415, "Ese tipo de archivo no está permitido.");

    const vault = await vaultDeLaSesion(sesion.userId);
    const bytes = await descargarArchivo(
      sesion.accessToken,
      vault.owner,
      vault.repo,
      rutaEnRepositorio(vault, ruta),
      vault.branch,
    );

    const nombre = encodeURIComponent(ruta.split("/").pop() ?? "archivo");
    const cabeceras = new Headers({
      "Content-Type": tipo.mime,
      "Content-Disposition": `${tipo.enLinea ? "inline" : "attachment"}; filename*=UTF-8''${nombre}`,
      "X-Content-Type-Options": "nosniff",
      "Accept-Ranges": "bytes",
      "Cache-Control": "private, max-age=300",
      Vary: "Cookie",
    });
    if (extensionDe(ruta) === "svg") cabeceras.set("Content-Security-Policy", "sandbox");

    const rango = leerRango(request.headers.get("range"), bytes.byteLength);
    if (!rango) {
      cabeceras.set("Content-Length", String(bytes.byteLength));
      return new Response(bytes as BodyInit, { status: 200, headers: cabeceras });
    }
    const parte = bytes.slice(rango.inicio, rango.fin + 1);
    cabeceras.set("Content-Range", `bytes ${rango.inicio}-${rango.fin}/${bytes.byteLength}`);
    cabeceras.set("Content-Length", String(parte.byteLength));
    return new Response(parte as BodyInit, { status: 206, headers: cabeceras });
  } catch (error) {
    return respuestaDeError(error);
  }
}
