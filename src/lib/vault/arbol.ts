export type NodoCarpeta = {
  tipo: "carpeta";
  nombre: string;
  ruta: string;
  hijos: NodoArbol[];
};

export type NodoNota = {
  tipo: "nota";
  nombre: string;
  ruta: string;
};

export type NodoArbol = NodoCarpeta | NodoNota;

const comparador = new Intl.Collator("es", { numeric: true, sensitivity: "base" });

function ordenar(nodos: NodoArbol[]) {
  nodos.sort((a, b) => {
    if (a.tipo !== b.tipo) return a.tipo === "carpeta" ? -1 : 1;
    return comparador.compare(a.nombre, b.nombre);
  });
  for (const nodo of nodos) {
    if (nodo.tipo === "carpeta") ordenar(nodo.hijos);
  }
}

export function construirArbol(rutas: string[]): NodoArbol[] {
  const raiz: NodoArbol[] = [];
  const carpetas = new Map<string, NodoCarpeta>();

  function carpetaDe(ruta: string): NodoArbol[] {
    if (!ruta) return raiz;
    const existente = carpetas.get(ruta);
    if (existente) return existente.hijos;
    const corte = ruta.lastIndexOf("/");
    const carpeta: NodoCarpeta = {
      tipo: "carpeta",
      nombre: ruta.slice(corte + 1),
      ruta,
      hijos: [],
    };
    carpetas.set(ruta, carpeta);
    carpetaDe(corte === -1 ? "" : ruta.slice(0, corte)).push(carpeta);
    return carpeta.hijos;
  }

  for (const ruta of rutas) {
    const corte = ruta.lastIndexOf("/");
    const nombre = ruta.slice(corte + 1).replace(/\.md$/i, "");
    carpetaDe(corte === -1 ? "" : ruta.slice(0, corte)).push({ tipo: "nota", nombre, ruta });
  }

  ordenar(raiz);
  return raiz;
}

export function carpetasAncestras(ruta: string | null): string[] {
  if (!ruta) return [];
  const segmentos = ruta.split("/").slice(0, -1);
  return segmentos.map((_, i) => segmentos.slice(0, i + 1).join("/"));
}
