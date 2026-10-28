import { esAdjunto } from "./tiposArchivo.ts";
import type { EnlaceNota } from "./tipos";

export type Resolutor = {
  resolverNota: (destino: string, desde: string) => string | null;
  resolverArchivo: (destino: string, desde: string) => string | null;
};

const esNota = (ruta: string) => ruta.toLowerCase().endsWith(".md");
const nombreBase = (ruta: string) => ruta.slice(ruta.lastIndexOf("/") + 1);
const carpetaDe = (ruta: string) => (ruta.includes("/") ? ruta.slice(0, ruta.lastIndexOf("/")) : "");
const sinExtensionMd = (ruta: string) => ruta.replace(/\.md$/i, "");

function agregar(mapa: Map<string, string[]>, clave: string, ruta: string) {
  const lista = mapa.get(clave);
  if (lista) lista.push(ruta);
  else mapa.set(clave, [ruta]);
}

function afinidad(candidato: string, desde: string) {
  const a = carpetaDe(candidato).split("/");
  const b = carpetaDe(desde).split("/");
  let comunes = 0;
  while (comunes < a.length && comunes < b.length && a[comunes] === b[comunes]) comunes++;
  return carpetaDe(candidato) === "" ? 0 : comunes;
}

function elegir(candidatos: string[] | undefined, desde: string) {
  if (!candidatos?.length) return null;
  return [...candidatos].sort(
    (a, b) => afinidad(b, desde) - afinidad(a, desde) || a.length - b.length || a.localeCompare(b),
  )[0];
}

function unirRelativa(destino: string, desde: string) {
  const segmentos = carpetaDe(desde) ? carpetaDe(desde).split("/") : [];
  for (const parte of destino.split("/")) {
    if (parte === "." || parte === "") continue;
    if (parte === "..") {
      if (segmentos.length === 0) return null;
      segmentos.pop();
    } else {
      segmentos.push(parte);
    }
  }
  return segmentos.join("/");
}

export function crearResolutor(rutas: string[]): Resolutor {
  const notasPorNombre = new Map<string, string[]>();
  const archivosPorNombre = new Map<string, string[]>();
  const notas: string[] = [];

  for (const ruta of rutas) {
    const nombre = nombreBase(ruta).toLowerCase();
    agregar(archivosPorNombre, nombre, ruta);
    if (esNota(ruta)) {
      notas.push(ruta);
      agregar(notasPorNombre, sinExtensionMd(nombre), ruta);
    }
  }

  function porSufijo(lista: string[], destino: string, quitarMd: boolean) {
    const objetivo = destino.toLowerCase();
    return lista.filter((ruta) => {
      const comparable = (quitarMd ? sinExtensionMd(ruta) : ruta).toLowerCase();
      return comparable === objetivo || comparable.endsWith(`/${objetivo}`);
    });
  }

  function buscar(destino: string, desde: string, soloNotas: boolean) {
    const limpio = destino.trim();
    if (!limpio) return null;
    const lista = soloNotas ? notas : rutas;
    const sinMd = soloNotas ? sinExtensionMd(limpio) : limpio;

    if (limpio.startsWith("./") || limpio.startsWith("../")) {
      const relativa = unirRelativa(sinMd, desde)?.toLowerCase();
      if (!relativa) return null;
      const exactas = lista.filter(
        (ruta) => (soloNotas ? sinExtensionMd(ruta) : ruta).toLowerCase() === relativa,
      );
      return elegir(exactas, desde);
    }
    if (sinMd.includes("/")) return elegir(porSufijo(lista, sinMd, soloNotas), desde);
    const mapa = soloNotas ? notasPorNombre : archivosPorNombre;
    return elegir(mapa.get(sinMd.toLowerCase()), desde);
  }

  return {
    resolverNota: (destino, desde) => (destino.trim() ? buscar(destino, desde, true) : desde),
    resolverArchivo: (destino, desde) => buscar(destino, desde, false),
  };
}

export type NotaConEnlaces = {
  ruta: string;
  titulo: string;
  enlaces: EnlaceNota[];
};

export type EntranteNota = {
  ruta: string;
  titulo: string;
};

export type EnlaceSaliente = {
  destino: string;
  tipo: "nota" | "archivo" | "inexistente";
  ruta: string | null;
};

const comparador = new Intl.Collator("es", { numeric: true, sensitivity: "base" });

export type SugerenciaEnlace = {
  texto: string;
  ruta: string;
};

export function nombresParaEnlazar(rutas: string[]): SugerenciaEnlace[] {
  const notas = rutas.filter(esNota);
  const repetidos = new Map<string, number>();
  for (const ruta of notas) {
    const clave = sinExtensionMd(nombreBase(ruta)).toLowerCase();
    repetidos.set(clave, (repetidos.get(clave) ?? 0) + 1);
  }
  return notas
    .map((ruta) => {
      const nombre = sinExtensionMd(nombreBase(ruta));
      const duplicado = (repetidos.get(nombre.toLowerCase()) ?? 0) > 1;
      return { texto: duplicado ? sinExtensionMd(ruta) : nombre, ruta };
    })
    .sort((a, b) => comparador.compare(a.texto, b.texto));
}

export function filtrarSugerencias(sugerencias: SugerenciaEnlace[], consulta: string, limite = 8) {
  const buscada = consulta.trim().toLowerCase();
  if (!buscada) return sugerencias.slice(0, limite);
  const empiezan: SugerenciaEnlace[] = [];
  const contienen: SugerenciaEnlace[] = [];
  for (const sugerencia of sugerencias) {
    const posicion = sugerencia.texto.toLowerCase().indexOf(buscada);
    if (posicion === 0) empiezan.push(sugerencia);
    else if (posicion > 0) contienen.push(sugerencia);
  }
  return [...empiezan, ...contienen].slice(0, limite);
}

export function construirEntrantes(notas: NotaConEnlaces[], resolutor: Resolutor) {
  const entrantes = new Map<string, EntranteNota[]>();
  for (const nota of notas) {
    const destinos = new Set<string>();
    for (const enlace of nota.enlaces) {
      if (!enlace.destino) continue;
      const destino = resolutor.resolverNota(enlace.destino, nota.ruta);
      if (destino && destino !== nota.ruta) destinos.add(destino);
    }
    for (const destino of destinos) {
      const lista = entrantes.get(destino) ?? [];
      lista.push({ ruta: nota.ruta, titulo: nota.titulo });
      entrantes.set(destino, lista);
    }
  }
  for (const lista of entrantes.values()) {
    lista.sort((a, b) => comparador.compare(a.titulo, b.titulo) || a.ruta.localeCompare(b.ruta));
  }
  return entrantes;
}

export function resolverSalientes(
  enlaces: EnlaceNota[],
  desde: string,
  resolutor: Resolutor,
): EnlaceSaliente[] {
  const vistos = new Set<string>();
  const salientes: EnlaceSaliente[] = [];
  for (const enlace of enlaces) {
    if (!enlace.destino) continue;
    const adjunto = esAdjunto(enlace.destino);
    const ruta = adjunto
      ? resolutor.resolverArchivo(enlace.destino, desde)
      : resolutor.resolverNota(enlace.destino, desde);
    if (ruta === desde) continue;
    const llave = ruta ?? `?${enlace.destino.toLowerCase()}`;
    if (vistos.has(llave)) continue;
    vistos.add(llave);
    salientes.push({
      destino: enlace.destino,
      tipo: !ruta ? "inexistente" : adjunto ? "archivo" : "nota",
      ruta,
    });
  }
  return salientes;
}
