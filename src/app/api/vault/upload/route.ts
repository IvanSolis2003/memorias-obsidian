import { NextResponse, type NextRequest } from "next/server";
import { registrarAuditoria } from "@/lib/db";
import { ErrorApi, respuestaDeError } from "@/lib/errores";
import { guardarArchivo } from "@/lib/github";
import { requerirSesion } from "@/lib/sesion";
import { rutaEnRepositorio, vaultDeLaSesion } from "@/lib/vault/acceso";
import {
  carpetaDestino,
  conSufijo,
  enlaceDeAdjunto,
  LIMITE_ADJUNTO_BYTES,
  sanearNombre,
  validarAdjunto,
  verificarContenido,
} from "@/lib/vault/attachments";
import { carpetaDeAdjuntosConfigurada } from "@/lib/vault/configuracion";
import { carpetaDeRuta } from "@/lib/vault/nombres";
import { validarRuta } from "@/lib/vault/rutas";
import { extensionDe } from "@/lib/vault/tiposArchivo";

const INTENTOS_MAXIMOS = 25;

async function leerFormulario(request: NextRequest) {
  try {
    return await request.formData();
  } catch {
    throw new ErrorApi(400, "No se pudo leer el archivo enviado.");
  }
}

export async function POST(request: NextRequest) {
  try {
    const sesion = await requerirSesion();
    const formulario = await leerFormulario(request);
    const archivo = formulario.get("archivo");
    const rutaNota = validarRuta(formulario.get("ruta"));
    if (!(archivo instanceof File)) throw new ErrorApi(400, "Falta el archivo.");
    if (!rutaNota.toLowerCase().endsWith(".md")) {
      throw new ErrorApi(400, "La nota desde la que se adjunta no es válida.");
    }
    if (archivo.size > LIMITE_ADJUNTO_BYTES) {
      throw new ErrorApi(413, "El archivo supera el tamaño máximo permitido.");
    }

    const nombre = sanearNombre(archivo.name);
    const problema = validarAdjunto(nombre, archivo.type, archivo.size);
    if (problema) throw new ErrorApi(415, problema);

    const bytes = new Uint8Array(await archivo.arrayBuffer());
    const incoherencia = verificarContenido(bytes, extensionDe(nombre));
    if (incoherencia) throw new ErrorApi(415, incoherencia);

    const vault = await vaultDeLaSesion(sesion.userId);
    const configurada = await carpetaDeAdjuntosConfigurada(sesion.accessToken, vault);
    const carpeta = carpetaDestino(configurada, carpetaDeRuta(rutaNota));

    for (let intento = 0; intento < INTENTOS_MAXIMOS; intento++) {
      const candidato = conSufijo(nombre, intento);
      const ruta = validarRuta(carpeta ? `${carpeta}/${candidato}` : candidato);
      try {
        const resultado = await guardarArchivo(sesion.accessToken, vault.owner, vault.repo, {
          ruta: rutaEnRepositorio(vault, ruta),
          contenido: bytes,
          mensaje: `Memorias Obsidian: adjuntar ${ruta}`,
          branch: vault.branch,
          sha: null,
        });
        await registrarAuditoria(sesion.userId, "app", "adjuntar", ruta).catch(() => null);
        return NextResponse.json({
          ruta,
          nombre: candidato,
          sha: resultado.sha,
          tamano: bytes.byteLength,
          enlace: enlaceDeAdjunto(candidato),
        });
      } catch (error) {
        const ocupado = error instanceof ErrorApi && error.datos.codigo === "conflicto";
        if (!ocupado) throw error;
      }
    }
    throw new ErrorApi(409, "No se encontró un nombre libre para el archivo. Cámbiale el nombre.");
  } catch (error) {
    return respuestaDeError(error);
  }
}
