import { NextResponse, type NextRequest } from "next/server";
import { registrarAuditoria } from "@/lib/db";
import { ErrorApi, respuestaDeError } from "@/lib/errores";
import { guardarArchivo } from "@/lib/github";
import { requerirSesion } from "@/lib/sesion";
import { rutaEnRepositorio, vaultDeLaSesion } from "@/lib/vault/acceso";
import { validarRuta } from "@/lib/vault/rutas";

const MAX_BYTES_NOTA = 1024 * 1024;
const FORMATO_SHA = /^[0-9a-f]{40}$/i;

function leerSolicitud(cuerpo: unknown) {
  const datos = (cuerpo ?? {}) as Record<string, unknown>;
  const ruta = validarRuta(datos.ruta);
  if (!ruta.toLowerCase().endsWith(".md")) {
    throw new ErrorApi(400, "Solo se pueden guardar notas con extensión .md.");
  }
  if (typeof datos.contenido !== "string") {
    throw new ErrorApi(400, "El contenido de la nota no es válido.");
  }
  if (Buffer.byteLength(datos.contenido, "utf8") > MAX_BYTES_NOTA) {
    throw new ErrorApi(413, "La nota supera el tamaño máximo de 1 MB.");
  }
  const shaBase = datos.shaBase ?? null;
  if (shaBase !== null && (typeof shaBase !== "string" || !FORMATO_SHA.test(shaBase))) {
    throw new ErrorApi(400, "La versión base de la nota no es válida.");
  }
  return { ruta, contenido: datos.contenido, shaBase };
}

export async function POST(request: NextRequest) {
  try {
    const sesion = await requerirSesion();
    const { ruta, contenido, shaBase } = leerSolicitud(await request.json().catch(() => null));
    const vault = await vaultDeLaSesion(sesion.userId);

    const resultado = await guardarArchivo(sesion.accessToken, vault.owner, vault.repo, {
      ruta: rutaEnRepositorio(vault, ruta),
      contenido,
      mensaje: `Memorias Obsidian: ${shaBase ? "editar" : "crear"} ${ruta}`,
      branch: vault.branch,
      sha: shaBase,
    });

    await registrarAuditoria(sesion.userId, "app", shaBase ? "guardar" : "crear", ruta).catch(
      () => null,
    );
    return NextResponse.json(resultado);
  } catch (error) {
    return respuestaDeError(error);
  }
}
