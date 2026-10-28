import { invalidarCache } from "./resolutor";
import { analizarNota } from "./parse";
import { guardarMeta, guardarNotas, leerMeta } from "./store";
import type { NotaGuardada } from "./tipos";

export type CodigoErrorGuardado = "conflicto" | "sin-conexion" | "otro";

export class ErrorGuardado extends Error {
  codigo: CodigoErrorGuardado;

  constructor(codigo: CodigoErrorGuardado, mensaje: string) {
    super(mensaje);
    this.codigo = codigo;
  }
}

export type VersionRemota = {
  sha: string;
  contenido: string;
};

async function pedir(url: string, cuerpo: unknown) {
  if (typeof navigator !== "undefined" && navigator.onLine === false) {
    throw new ErrorGuardado("sin-conexion", "Sin conexión. Tu texto se conserva como borrador.");
  }
  let respuesta: Response;
  try {
    respuesta = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(cuerpo),
      cache: "no-store",
    });
  } catch {
    throw new ErrorGuardado("sin-conexion", "Sin conexión. Tu texto se conserva como borrador.");
  }
  const datos = await respuesta.json().catch(() => null);
  if (!respuesta.ok) {
    const codigo = datos?.codigo === "conflicto" ? "conflicto" : "otro";
    throw new ErrorGuardado(codigo, datos?.error ?? "No se pudo guardar la nota.");
  }
  return datos;
}

export async function guardarNota(ruta: string, contenido: string, shaBase: string | null) {
  const datos = await pedir("/api/vault/save", { ruta, contenido, shaBase });
  return datos.sha as string;
}

export async function leerVersionRemota(ruta: string): Promise<VersionRemota | null> {
  const datos = await pedir("/api/vault/blob", { rutas: [ruta] });
  const nota = datos.notas?.[0];
  return nota ? { sha: nota.sha, contenido: nota.contenido } : null;
}

export async function crearNota(clave: string, ruta: string) {
  let sha: string;
  try {
    sha = await guardarNota(ruta, "", null);
  } catch (error) {
    if (error instanceof ErrorGuardado && error.codigo === "conflicto") {
      throw new ErrorGuardado(
        "conflicto",
        "Ya existe una nota con ese nombre en GitHub (quizá se creó desde el computador). Usa Actualizar y vuelve a intentar.",
      );
    }
    throw error;
  }
  await aplicarGuardado(clave, ruta, "", sha);
  await registrarArchivoEnMeta(clave, ruta, sha, 0);
  return sha;
}

export async function registrarArchivoEnMeta(
  clave: string,
  ruta: string,
  sha: string,
  tamano: number,
) {
  const meta = await leerMeta(clave);
  if (meta && !meta.archivos.some((archivo) => archivo.ruta === ruta)) {
    await guardarMeta({ ...meta, archivos: [...meta.archivos, { ruta, sha, tamano }] });
  }
  invalidarCache();
}

export async function aplicarGuardado(
  clave: string,
  ruta: string,
  contenido: string,
  sha: string,
) {
  const nota: NotaGuardada = {
    clave,
    ruta,
    sha,
    tamano: new Blob([contenido]).size,
    titulo: (ruta.split("/").pop() ?? ruta).replace(/\.md$/i, ""),
    ...analizarNota(contenido),
  };
  await guardarNotas([{ nota, contenido }]);
  invalidarCache();
}
