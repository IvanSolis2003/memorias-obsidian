import { NextResponse, type NextRequest } from "next/server";
import { mapConLimite } from "@/lib/concurrencia";
import { ErrorApi, respuestaDeError } from "@/lib/errores";
import { obtenerContenido } from "@/lib/github";
import { requerirSesion } from "@/lib/sesion";
import { rutaEnRepositorio, vaultDeLaSesion } from "@/lib/vault/acceso";
import { validarRuta } from "@/lib/vault/rutas";

const MAX_NOTAS_POR_LOTE = 20;
const CONCURRENCIA = 5;
const ESTADOS_GLOBALES = [401, 403, 429];

function leerRutas(cuerpo: unknown): string[] {
  const rutas = (cuerpo as { rutas?: unknown } | null)?.rutas;
  if (!Array.isArray(rutas) || rutas.length === 0 || rutas.length > MAX_NOTAS_POR_LOTE) {
    throw new ErrorApi(400, `Pide entre 1 y ${MAX_NOTAS_POR_LOTE} notas por lote.`);
  }
  return rutas.map((ruta) => {
    const valida = validarRuta(ruta);
    if (!valida.toLowerCase().endsWith(".md")) {
      throw new ErrorApi(400, "Solo se pueden pedir notas .md.");
    }
    return valida;
  });
}

export async function POST(request: NextRequest) {
  try {
    const sesion = await requerirSesion();
    const rutas = leerRutas(await request.json().catch(() => null));
    const vault = await vaultDeLaSesion(sesion.userId);

    const resultados = await mapConLimite(rutas, CONCURRENCIA, async (ruta) => {
      try {
        const { sha, contenido } = await obtenerContenido(
          sesion.accessToken,
          vault.owner,
          vault.repo,
          rutaEnRepositorio(vault, ruta),
          vault.branch,
        );
        return { ruta, sha, contenido };
      } catch (error) {
        if (error instanceof ErrorApi && ESTADOS_GLOBALES.includes(error.estado)) throw error;
        return {
          ruta,
          error: error instanceof ErrorApi ? error.message : "No se pudo leer la nota.",
        };
      }
    });

    return NextResponse.json({
      notas: resultados.filter((resultado) => "sha" in resultado),
      errores: resultados.filter((resultado) => "error" in resultado),
    });
  } catch (error) {
    return respuestaDeError(error);
  }
}
