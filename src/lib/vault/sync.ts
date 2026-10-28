import { mapConLimite } from "../concurrencia";
import { analizarNota } from "./parse";
import { eliminarNotas, guardarMeta, guardarNotas, leerMeta, listarNotas } from "./store";
import type { ArchivoVault, NotaGuardada } from "./tipos";

const NOTAS_POR_LOTE = 20;
const LOTES_EN_PARALELO = 6;

export type Progreso = {
  hechas: number;
  total: number;
};

export type ResultadoSync = {
  sinCambios: boolean;
  descargadas: number;
  eliminadas: number;
  fallidas: number;
  notasTotales: number;
  truncado: boolean;
};

export type CodigoErrorSync = "sin-conexion" | "no-autenticado" | "sin-vault" | "otro";

export class ErrorSync extends Error {
  codigo: CodigoErrorSync;
  destino?: string;

  constructor(codigo: CodigoErrorSync, mensaje: string, destino?: string) {
    super(mensaje);
    this.codigo = codigo;
    this.destino = destino;
  }
}

type RespuestaArbol = {
  commitSha: string;
  archivos: ArchivoVault[];
  truncado: boolean;
};

type RespuestaLote = {
  notas: { ruta: string; sha: string; contenido: string }[];
  errores: { ruta: string; error: string }[];
};

const esNota = (ruta: string) => ruta.toLowerCase().endsWith(".md");

const nombreDeNota = (ruta: string) => (ruta.split("/").pop() ?? ruta).replace(/\.md$/i, "");

function aLotes<T>(elementos: T[], tamano: number) {
  const lotes: T[][] = [];
  for (let i = 0; i < elementos.length; i += tamano) lotes.push(elementos.slice(i, i + tamano));
  return lotes;
}

async function pedir(url: string, init?: RequestInit) {
  if (typeof navigator !== "undefined" && navigator.onLine === false) {
    throw new ErrorSync("sin-conexion", "Sin conexión.");
  }
  let respuesta: Response;
  try {
    respuesta = await fetch(url, { ...init, cache: "no-store" });
  } catch {
    throw new ErrorSync("sin-conexion", "Sin conexión.");
  }
  if (respuesta.ok || respuesta.status === 304) return respuesta;

  const datos = await respuesta.json().catch(() => null);
  const mensaje = datos?.error ?? "No se pudo completar la actualización.";
  if (respuesta.status === 401) throw new ErrorSync("no-autenticado", mensaje, "/login");
  if (respuesta.status === 409) throw new ErrorSync("sin-vault", mensaje, datos?.ir ?? "/conexiones");
  throw new ErrorSync("otro", mensaje);
}

async function pedirLote(rutas: string[]): Promise<RespuestaLote> {
  const respuesta = await pedir("/api/vault/blob", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ rutas }),
  });
  return respuesta.json();
}

export async function sincronizar(
  clave: string,
  alProgreso: (progreso: Progreso) => void,
): Promise<ResultadoSync> {
  const meta = await leerMeta(clave);
  const respuestaArbol = await pedir(
    "/api/vault/tree",
    meta?.etag ? { headers: { "If-None-Match": meta.etag } } : undefined,
  );

  if (respuestaArbol.status === 304 && meta) {
    await guardarMeta({ ...meta, ultimaActualizacion: new Date().toISOString() });
    const locales = await listarNotas(clave);
    return {
      sinCambios: true,
      descargadas: 0,
      eliminadas: 0,
      fallidas: 0,
      notasTotales: locales.length,
      truncado: meta.truncado,
    };
  }

  const arbol: RespuestaArbol = await respuestaArbol.json();
  const etag = respuestaArbol.headers.get("etag");
  const remotas = arbol.archivos.filter((archivo) => esNota(archivo.ruta));
  const locales = await listarNotas(clave);
  const shaLocal = new Map(locales.map((nota) => [nota.ruta, nota.sha]));
  const rutasRemotas = new Set(remotas.map((archivo) => archivo.ruta));

  const porDescargar = remotas.filter((archivo) => shaLocal.get(archivo.ruta) !== archivo.sha);
  const porEliminar = locales.filter((nota) => !rutasRemotas.has(nota.ruta)).map((nota) => nota.ruta);
  const tamanos = new Map(remotas.map((archivo) => [archivo.ruta, archivo.tamano]));

  let hechas = 0;
  let fallidas = 0;
  alProgreso({ hechas, total: porDescargar.length });

  await mapConLimite(
    aLotes(
      porDescargar.map((archivo) => archivo.ruta),
      NOTAS_POR_LOTE,
    ),
    LOTES_EN_PARALELO,
    async (rutas) => {
      const lote = await pedirLote(rutas);
      const items = lote.notas.map(({ ruta, sha, contenido }) => {
        const nota: NotaGuardada = {
          clave,
          ruta,
          sha,
          tamano: tamanos.get(ruta) ?? contenido.length,
          titulo: nombreDeNota(ruta),
          ...analizarNota(contenido),
        };
        return { nota, contenido };
      });
      await guardarNotas(items);
      hechas += items.length;
      fallidas += lote.errores.length;
      alProgreso({ hechas, total: porDescargar.length });
    },
  );

  if (fallidas === 0) {
    await eliminarNotas(clave, porEliminar);
    await guardarMeta({
      clave,
      commitSha: arbol.commitSha,
      etag,
      archivos: arbol.archivos,
      truncado: arbol.truncado,
      ultimaActualizacion: new Date().toISOString(),
    });
  }

  return {
    sinCambios: false,
    descargadas: hechas,
    eliminadas: fallidas === 0 ? porEliminar.length : 0,
    fallidas,
    notasTotales: remotas.length - fallidas,
    truncado: arbol.truncado,
  };
}
