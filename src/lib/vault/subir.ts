import {
  enlaceDeAdjunto,
  esImagen,
  nombrePegado,
  sanearNombre,
  validarAdjunto,
} from "./attachments";
import { registrarArchivoEnMeta } from "./guardar";
import { leerMeta } from "./store";
import { extensionDe } from "./tiposArchivo";
import { prepararImagen } from "./comprimir";

export type OrigenAdjunto = "camara" | "fotos" | "archivo";

export type AdjuntoSubido = {
  ruta: string;
  nombre: string;
  enlace: string;
  tamano: number;
  vistaPrevia: string | null;
};

const MENSAJE_SIN_CONEXION = "Sin conexión. No se puede adjuntar ahora.";

async function enviar(archivo: File, rutaNota: string) {
  const formulario = new FormData();
  formulario.set("archivo", archivo, archivo.name);
  formulario.set("ruta", rutaNota);

  let respuesta: Response;
  try {
    respuesta = await fetch("/api/vault/upload", { method: "POST", body: formulario, cache: "no-store" });
  } catch {
    throw new Error(MENSAJE_SIN_CONEXION);
  }
  if (respuesta.status === 413) {
    throw new Error("El archivo es demasiado grande para subirlo.");
  }
  const datos = await respuesta.json().catch(() => null);
  if (!respuesta.ok) throw new Error(datos?.error ?? "No se pudo subir el archivo.");
  return datos as { ruta: string; nombre: string; sha: string; tamano: number };
}

export async function subirAdjunto(
  clave: string,
  rutaNota: string,
  original: File,
  origen: OrigenAdjunto,
): Promise<AdjuntoSubido> {
  if (typeof navigator !== "undefined" && navigator.onLine === false) {
    throw new Error(MENSAJE_SIN_CONEXION);
  }

  const procesado = await prepararImagen(original);
  const nombre =
    origen === "camara" && esImagen(extensionDe(procesado.name))
      ? nombrePegado(new Date(), extensionDe(procesado.name))
      : sanearNombre(procesado.name);
  const archivo = new File([procesado], nombre, { type: procesado.type });

  const problema = validarAdjunto(archivo.name, archivo.type, archivo.size);
  if (problema) throw new Error(problema);

  const resultado = await enviar(archivo, rutaNota);

  const meta = await leerMeta(clave);
  const repetido = (meta?.archivos ?? []).some(
    (existente) =>
      existente.ruta !== resultado.ruta &&
      (existente.ruta.split("/").pop() ?? "").toLowerCase() === resultado.nombre.toLowerCase(),
  );
  await registrarArchivoEnMeta(clave, resultado.ruta, resultado.sha, resultado.tamano);

  return {
    ruta: resultado.ruta,
    nombre: resultado.nombre,
    enlace: enlaceDeAdjunto(repetido ? resultado.ruta : resultado.nombre),
    tamano: resultado.tamano,
    vistaPrevia: esImagen(extensionDe(resultado.nombre)) ? URL.createObjectURL(archivo) : null,
  };
}
