import matter from "gray-matter";
import type { EnlaceNota, TituloNota } from "./tipos";

export type NotaAnalizada = {
  propiedades: Record<string, unknown>;
  tags: string[];
  enlaces: EnlaceNota[];
  titulos: TituloNota[];
};

const REGEX_WIKILINK = /(!?)\[\[([^[\]\n]+?)\]\]/g;
const REGEX_ENLACE_MD = /(!?)\[[^\]\n]*\]\(([^)\s]+)\)/g;
const REGEX_TAG = /(?<=^|\s)#((?=[\p{L}\p{N}_/-]*[\p{L}_/-])[\p{L}\p{N}_/-]+)/gmu;
const REGEX_TITULO = /^(#{1,6})\s+(.+?)\s*#*\s*$/;
const REGEX_EXTERNO = /^([a-z][a-z0-9+.-]*:|\/\/|#)/i;

function quitarCodigoYComentarios(texto: string) {
  let marcador = "";
  const lineas = texto.split("\n").map((linea) => {
    const cerco = /^\s*(`{3,}|~{3,})/.exec(linea);
    if (cerco) {
      if (!marcador) marcador = cerco[1][0];
      else if (cerco[1][0] === marcador) marcador = "";
      return "";
    }
    return marcador ? "" : linea;
  });
  return lineas
    .join("\n")
    .replace(/%%[\s\S]*?%%/g, (comentario) => comentario.replace(/[^\n]/g, ""))
    .replace(/`[^`\n]*`/g, "");
}

function normalizarValor(valor: unknown): unknown {
  if (valor instanceof Date) return valor.toISOString();
  if (Array.isArray(valor)) return valor.map(normalizarValor);
  if (valor && typeof valor === "object") {
    return Object.fromEntries(
      Object.entries(valor).map(([clave, interno]) => [clave, normalizarValor(interno)]),
    );
  }
  return valor;
}

export function separarFrontmatter(texto: string) {
  try {
    const { data, content } = matter(texto, {});
    return { propiedades: normalizarValor(data) as Record<string, unknown>, cuerpo: content };
  } catch {
    return { propiedades: {}, cuerpo: texto };
  }
}

function etiquetasDeFrontmatter(propiedades: Record<string, unknown>) {
  const crudo = propiedades.tags ?? propiedades.tag;
  const lista = Array.isArray(crudo)
    ? crudo
    : typeof crudo === "string"
      ? crudo.split(/[\s,]+/)
      : [];
  return lista
    .filter((tag): tag is string => typeof tag === "string")
    .map((tag) => tag.trim().replace(/^#/, ""))
    .filter(Boolean);
}

function enlaceDesdeObjetivo(objetivo: string, alias: string | undefined, embed: boolean) {
  let destino = objetivo.trim();
  let seccion: string | undefined;
  const marca = destino.indexOf("#");
  if (marca >= 0) {
    seccion = destino.slice(marca + 1).trim() || undefined;
    destino = destino.slice(0, marca).trim();
  }
  const enlace: EnlaceNota = { destino, embed };
  if (seccion) enlace.seccion = seccion;
  if (alias) enlace.alias = alias;
  return enlace;
}

export function enlaceDesdeInterior(interior: string, embed: boolean) {
  const [objetivo, ...resto] = interior.split(/\\?\|/);
  return enlaceDesdeObjetivo(objetivo, resto.join("|").trim() || undefined, embed);
}

function extraerEnlaces(cuerpo: string) {
  const enlaces = new Map<string, EnlaceNota>();
  const agregar = (enlace: EnlaceNota) => {
    enlaces.set(`${enlace.destino}#${enlace.seccion ?? ""}|${enlace.embed}`, enlace);
  };

  for (const coincidencia of cuerpo.matchAll(REGEX_WIKILINK)) {
    agregar(enlaceDesdeInterior(coincidencia[2], coincidencia[1] === "!"));
  }

  for (const coincidencia of cuerpo.matchAll(REGEX_ENLACE_MD)) {
    const destino = coincidencia[2];
    if (REGEX_EXTERNO.test(destino)) continue;
    let decodificado = destino;
    try {
      decodificado = decodeURIComponent(destino);
    } catch {}
    agregar(enlaceDesdeObjetivo(decodificado.replace(/\.md(?=#|$)/i, ""), undefined, coincidencia[1] === "!"));
  }

  return [...enlaces.values()];
}

function extraerTitulos(cuerpo: string) {
  const titulos: TituloNota[] = [];
  for (const linea of cuerpo.split("\n")) {
    const coincidencia = REGEX_TITULO.exec(linea);
    if (coincidencia) titulos.push({ nivel: coincidencia[1].length, texto: coincidencia[2] });
  }
  return titulos;
}

export function analizarNota(texto: string): NotaAnalizada {
  const { propiedades, cuerpo } = separarFrontmatter(texto);
  const limpio = quitarCodigoYComentarios(cuerpo);

  const tags = new Set(etiquetasDeFrontmatter(propiedades));
  for (const coincidencia of limpio.matchAll(REGEX_TAG)) tags.add(coincidencia[1]);

  return {
    propiedades,
    tags: [...tags],
    enlaces: extraerEnlaces(limpio),
    titulos: extraerTitulos(limpio),
  };
}
