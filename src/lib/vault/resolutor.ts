import {
  construirEntrantes,
  crearResolutor,
  type EntranteNota,
  type Resolutor,
} from "./links";
import { leerMeta, listarNotas } from "./store";

type Cache = {
  llave: string;
  resolutor: Resolutor;
  tamanos: Map<string, number>;
  entrantes?: Map<string, EntranteNota[]>;
};

let cache: Cache | null = null;

async function asegurarCache(clave: string): Promise<Cache> {
  const meta = await leerMeta(clave);
  const llave = `${clave}|${meta?.ultimaActualizacion ?? ""}`;
  if (cache?.llave !== llave) {
    cache = {
      llave,
      resolutor: crearResolutor(meta ? meta.archivos.map((archivo) => archivo.ruta) : []),
      tamanos: new Map((meta?.archivos ?? []).map((archivo) => [archivo.ruta, archivo.tamano])),
    };
  }
  return cache;
}

export function invalidarCache() {
  cache = null;
}

export async function obtenerResolutor(clave: string) {
  return (await asegurarCache(clave)).resolutor;
}

export async function obtenerTamanos(clave: string) {
  return (await asegurarCache(clave)).tamanos;
}

export async function obtenerEntrantes(clave: string, ruta: string) {
  const actual = await asegurarCache(clave);
  if (!actual.entrantes) {
    actual.entrantes = construirEntrantes(await listarNotas(clave), actual.resolutor);
  }
  return actual.entrantes.get(ruta) ?? [];
}
