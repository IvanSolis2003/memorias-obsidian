import MiniSearch from "minisearch";
import { carpetaDeRuta } from "./nombres";
import { separarFrontmatter } from "./parse";
import { listarContenidos, listarNotas } from "./store";
import { tituloDeRuta } from "./url";

type DocumentoBusqueda = {
  id: string;
  titulo: string;
  ruta: string;
  tags: string;
  contenido: string;
};

export type Indice = {
  motor: MiniSearch<DocumentoBusqueda>;
  contenidos: Map<string, string>;
  titulos: Map<string, string>;
};

export type ResultadoBusqueda = {
  ruta: string;
  titulo: string;
  carpeta: string;
  terminos: string[];
  fragmento: string | null;
};

export type Segmento = { texto: string; marca: boolean };

const LARGO_FRAGMENTO = 150;
const ANTES_FRAGMENTO = 40;

function normalizarCaracter(caracter: string) {
  return (caracter.normalize("NFD")[0] ?? caracter).toLowerCase();
}

function normalizarTexto(texto: string) {
  let salida = "";
  for (const caracter of texto) salida += normalizarCaracter(caracter);
  return salida.length === texto.length ? salida : texto.toLowerCase();
}

function procesarTermino(termino: string) {
  return termino
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase();
}

function limpiarMarkdown(texto: string) {
  return texto
    .replace(/!\[\[[^\]]*\]\]/g, " ")
    .replace(/\[\[([^\]|#]*)(?:#[^\]|]*)?(?:\|([^\]]*))?\]\]/g, (_, destino: string, alias?: string) =>
      alias || destino.split("/").pop() || "",
    )
    .replace(/!?\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/^\s{0,3}#{1,6}\s+/gm, "")
    .replace(/%%[\s\S]*?%%/g, " ")
    .replace(/[*_`=~]{2,}|`/g, "");
}

function crearMotor() {
  return new MiniSearch<DocumentoBusqueda>({
    fields: ["titulo", "ruta", "tags", "contenido"],
    processTerm: procesarTermino,
    searchOptions: {
      boost: { titulo: 4, ruta: 2, tags: 2 },
      prefix: true,
      fuzzy: (termino) => (termino.length > 4 ? 0.2 : false),
      combineWith: "AND",
      processTerm: procesarTermino,
    },
  });
}

let cache: { llave: string; promesa: Promise<Indice> } | null = null;

async function construirIndice(clave: string): Promise<Indice> {
  const [notas, contenidosGuardados] = await Promise.all([listarNotas(clave), listarContenidos(clave)]);
  const crudos = new Map(contenidosGuardados.map((item) => [item.ruta, item.contenido]));
  const motor = crearMotor();
  const contenidos = new Map<string, string>();
  const titulos = new Map<string, string>();
  const documentos: DocumentoBusqueda[] = notas.map((nota) => {
    const cuerpo = limpiarMarkdown(separarFrontmatter(crudos.get(nota.ruta) ?? "").cuerpo);
    contenidos.set(nota.ruta, cuerpo);
    titulos.set(nota.ruta, nota.titulo || tituloDeRuta(nota.ruta));
    return {
      id: nota.ruta,
      titulo: nota.titulo || tituloDeRuta(nota.ruta),
      ruta: nota.ruta.replace(/\.md$/i, ""),
      tags: nota.tags.join(" "),
      contenido: cuerpo,
    };
  });
  motor.addAll(documentos);
  return { motor, contenidos, titulos };
}

export function obtenerIndice(clave: string, version: number) {
  const llave = `${clave}|${version}`;
  if (cache?.llave !== llave) {
    cache = { llave, promesa: construirIndice(clave) };
  }
  return cache.promesa;
}

function fragmentoDe(contenido: string, terminos: string[]) {
  const normalizado = normalizarTexto(contenido);
  let posicion = -1;
  for (const termino of terminos) {
    const encontrada = normalizado.indexOf(termino);
    if (encontrada !== -1 && (posicion === -1 || encontrada < posicion)) posicion = encontrada;
  }
  if (posicion === -1) return null;
  let inicio = Math.max(0, posicion - ANTES_FRAGMENTO);
  if (inicio > 0) {
    const espacio = contenido.indexOf(" ", inicio);
    if (espacio !== -1 && espacio < posicion) inicio = espacio + 1;
  }
  let fin = Math.min(contenido.length, inicio + LARGO_FRAGMENTO);
  if (fin < contenido.length) {
    const espacio = contenido.lastIndexOf(" ", fin);
    if (espacio > posicion) fin = espacio;
  }
  const texto = contenido.slice(inicio, fin).replace(/\s+/g, " ").trim();
  return `${inicio > 0 ? "…" : ""}${texto}${fin < contenido.length ? "…" : ""}`;
}

function aResultado(indice: Indice, ruta: string, terminos: string[], conFragmento: boolean) {
  return {
    ruta,
    titulo: indice.titulos.get(ruta) ?? tituloDeRuta(ruta),
    carpeta: carpetaDeRuta(ruta),
    terminos,
    fragmento: conFragmento ? fragmentoDe(indice.contenidos.get(ruta) ?? "", terminos) : null,
  } satisfies ResultadoBusqueda;
}

export function buscar(indice: Indice, consulta: string, limite = 50): ResultadoBusqueda[] {
  if (!consulta.trim()) return [];
  return indice.motor
    .search(consulta)
    .slice(0, limite)
    .map((resultado) => aResultado(indice, String(resultado.id), resultado.terms, true));
}

export function buscarRapido(indice: Indice, consulta: string, limite = 12): ResultadoBusqueda[] {
  if (!consulta.trim()) return [];
  return indice.motor
    .search(consulta, { fields: ["titulo", "ruta"], boost: { titulo: 3 } })
    .slice(0, limite)
    .map((resultado) => aResultado(indice, String(resultado.id), resultado.terms, false));
}

export function resaltar(texto: string, terminos: string[]): Segmento[] {
  const normalizado = normalizarTexto(texto);
  const marcados = new Array<boolean>(texto.length).fill(false);
  for (const termino of terminos) {
    if (!termino) continue;
    let desde = normalizado.indexOf(termino);
    while (desde !== -1) {
      for (let i = desde; i < desde + termino.length; i++) marcados[i] = true;
      desde = normalizado.indexOf(termino, desde + termino.length);
    }
  }
  const segmentos: Segmento[] = [];
  for (let i = 0; i < texto.length; i++) {
    const ultimo = segmentos[segmentos.length - 1];
    if (ultimo && ultimo.marca === marcados[i]) ultimo.texto += texto[i];
    else segmentos.push({ texto: texto[i], marca: marcados[i] });
  }
  return segmentos;
}
