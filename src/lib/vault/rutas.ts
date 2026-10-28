import type { NodoArbol } from "../github";
import { ErrorApi } from "../errores";
import type { ArchivoVault } from "./tipos";

export function esRutaOculta(ruta: string): boolean {
  return ruta.split("/").some((segmento) => segmento.startsWith("."));
}

export function validarRuta(valor: unknown): string {
  if (typeof valor !== "string" || valor.length === 0 || valor.length > 1024) {
    throw new ErrorApi(400, "La ruta no es válida.");
  }
  const segmentos = valor.split("/");
  const invalida =
    valor.includes("\\") ||
    valor.includes("\0") ||
    segmentos.some((segmento) => segmento === "" || segmento === "." || segmento === "..") ||
    esRutaOculta(valor);
  if (invalida) throw new ErrorApi(400, "La ruta no es válida.");
  return valor;
}

export function filtrarArchivos(nodos: NodoArbol[], basePath: string | null): ArchivoVault[] {
  const prefijo = basePath ? `${basePath}/` : "";
  const archivos: ArchivoVault[] = [];
  for (const nodo of nodos) {
    if (nodo.type !== "blob" || !nodo.path.startsWith(prefijo)) continue;
    const ruta = nodo.path.slice(prefijo.length);
    if (esRutaOculta(ruta)) continue;
    archivos.push({ ruta, sha: nodo.sha, tamano: nodo.size ?? 0 });
  }
  return archivos;
}

export function normalizarBasePath(valor: unknown): string | null {
  if (valor === undefined || valor === null) return null;
  if (typeof valor !== "string") throw new ErrorApi(400, "La subcarpeta no es válida.");
  const limpio = valor.trim().replace(/^\/+|\/+$/g, "");
  if (!limpio) return null;
  if (limpio.includes("\\") || limpio.split("/").includes("..") || esRutaOculta(limpio)) {
    throw new ErrorApi(400, "La subcarpeta no es válida.");
  }
  return limpio;
}

export function resumirArbol(nodos: NodoArbol[], basePath: string | null) {
  const prefijo = basePath ? `${basePath}/` : "";
  let notas = 0;
  let adjuntos = 0;
  for (const nodo of nodos) {
    if (nodo.type !== "blob" || !nodo.path.startsWith(prefijo)) continue;
    const relativa = nodo.path.slice(prefijo.length);
    if (esRutaOculta(relativa)) continue;
    if (relativa.toLowerCase().endsWith(".md")) notas++;
    else adjuntos++;
  }
  const tieneObsidian = nodos.some(
    (nodo) => nodo.type === "tree" && nodo.path === `${prefijo}.obsidian`,
  );
  return { notas, adjuntos, tieneObsidian };
}
