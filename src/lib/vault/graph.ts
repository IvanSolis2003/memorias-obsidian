import type { NotaConEnlaces, Resolutor } from "./links";

export type NodoGrafo = {
  id: string;
  titulo: string;
  carpeta: string;
  grado: number;
};

export type AristaGrafo = {
  origen: string;
  destino: string;
};

export type Grafo = {
  nodos: NodoGrafo[];
  aristas: AristaGrafo[];
};

export type FiltrosGrafo = {
  texto: string;
  carpeta: string;
  huerfanas: boolean;
};

const carpetaDe = (ruta: string) => (ruta.includes("/") ? ruta.slice(0, ruta.lastIndexOf("/")) : "");

function armarGrafo(notas: { id: string; titulo: string }[], aristas: AristaGrafo[]): Grafo {
  const grados = new Map<string, number>();
  for (const { origen, destino } of aristas) {
    grados.set(origen, (grados.get(origen) ?? 0) + 1);
    grados.set(destino, (grados.get(destino) ?? 0) + 1);
  }
  return {
    nodos: notas.map((nota) => ({
      id: nota.id,
      titulo: nota.titulo,
      carpeta: carpetaDe(nota.id),
      grado: grados.get(nota.id) ?? 0,
    })),
    aristas,
  };
}

export function construirGrafo(notas: NotaConEnlaces[], resolutor: Resolutor): Grafo {
  const llaves = new Set<string>();
  const aristas: AristaGrafo[] = [];
  for (const nota of notas) {
    for (const enlace of nota.enlaces) {
      if (!enlace.destino) continue;
      const destino = resolutor.resolverNota(enlace.destino, nota.ruta);
      if (!destino || destino === nota.ruta) continue;
      const [a, b] = nota.ruta < destino ? [nota.ruta, destino] : [destino, nota.ruta];
      const llave = `${a}\u0000${b}`;
      if (llaves.has(llave)) continue;
      llaves.add(llave);
      aristas.push({ origen: nota.ruta, destino });
    }
  }
  return armarGrafo(
    notas.map((nota) => ({ id: nota.ruta, titulo: nota.titulo })),
    aristas,
  );
}

export function carpetaRaiz(carpeta: string) {
  const corte = carpeta.indexOf("/");
  return corte === -1 ? carpeta : carpeta.slice(0, corte);
}

export function maticesPorCarpeta(grafo: Grafo) {
  const raices = new Set<string>();
  for (const nodo of grafo.nodos) {
    const raiz = carpetaRaiz(nodo.carpeta);
    if (raiz) raices.add(raiz);
  }
  const matices = new Map<string, number>();
  [...raices]
    .sort((a, b) => a.localeCompare(b, "es", { numeric: true, sensitivity: "base" }))
    .forEach((raiz, indice) => matices.set(raiz, (250 + indice * 137.508) % 360));
  return matices;
}

export function vecinosPorNodo(grafo: Grafo) {
  const vecinos = new Map<string, Set<string>>();
  for (const nodo of grafo.nodos) vecinos.set(nodo.id, new Set());
  for (const { origen, destino } of grafo.aristas) {
    vecinos.get(origen)?.add(destino);
    vecinos.get(destino)?.add(origen);
  }
  return vecinos;
}

export function subgrafoLocal(grafo: Grafo, centro: string, profundidad: number): Grafo {
  const vecinos = vecinosPorNodo(grafo);
  if (!vecinos.has(centro)) return { nodos: [], aristas: [] };
  const incluidos = new Set([centro]);
  let frontera = [centro];
  for (let nivel = 0; nivel < profundidad; nivel++) {
    const siguiente: string[] = [];
    for (const id of frontera) {
      for (const vecino of vecinos.get(id) ?? []) {
        if (!incluidos.has(vecino)) {
          incluidos.add(vecino);
          siguiente.push(vecino);
        }
      }
    }
    frontera = siguiente;
  }
  return armarGrafo(
    grafo.nodos.filter((nodo) => incluidos.has(nodo.id)),
    grafo.aristas.filter((arista) => incluidos.has(arista.origen) && incluidos.has(arista.destino)),
  );
}

export function filtrarGrafo(grafo: Grafo, filtros: FiltrosGrafo): Grafo {
  const texto = filtros.texto.trim().toLowerCase();
  const prefijo = filtros.carpeta ? `${filtros.carpeta}/` : "";
  const sinFiltro = !texto && !prefijo && filtros.huerfanas;
  if (sinFiltro) return grafo;

  const base = grafo.nodos.filter(
    (nodo) =>
      (!texto || nodo.id.toLowerCase().includes(texto)) && (!prefijo || nodo.id.startsWith(prefijo)),
  );
  const ids = new Set(base.map((nodo) => nodo.id));
  const aristas = grafo.aristas.filter((a) => ids.has(a.origen) && ids.has(a.destino));
  const resultado = armarGrafo(
    base.map((nodo) => ({ id: nodo.id, titulo: nodo.titulo })),
    aristas,
  );
  if (filtros.huerfanas) return resultado;
  const conEnlaces = resultado.nodos.filter((nodo) => nodo.grado > 0);
  return { nodos: conEnlaces, aristas: resultado.aristas };
}
