import { enlaceDesdeInterior } from "./parse.ts";

export type NodoMd = {
  type: string;
  value?: string;
  children?: NodoMd[];
  data?: Record<string, unknown>;
  [clave: string]: unknown;
};

const REGEX_INLINE = new RegExp(
  [
    "(!?)\\[\\[([^\\[\\]\\n]+?)\\]\\]",
    "==([^=\\n]+?)==",
    "(?<=^|[\\s(])#((?=[\\p{L}\\p{N}_/-]*[\\p{L}_/-])[\\p{L}\\p{N}_/-]+)",
  ].join("|"),
  "gu",
);
const REGEX_CALLOUT = /^\[!([A-Za-z][\w-]*)\]([+-]?)[ \t]*([^\n]*)/;
const REGEX_TITULO = /^(#{1,6})\s+(.+?)\s*#*\s*$/;
const NODOS_OPACOS = new Set(["code", "inlineCode", "html", "link", "linkReference", "definition"]);

export const ALIAS_CALLOUT: Record<string, string> = {
  summary: "abstract",
  tldr: "abstract",
  hint: "tip",
  important: "tip",
  check: "success",
  done: "success",
  help: "question",
  faq: "question",
  caution: "warning",
  attention: "warning",
  fail: "failure",
  missing: "failure",
  error: "danger",
  cite: "quote",
};

export function tipoDeCallout(tipo: string) {
  const minuscula = tipo.toLowerCase();
  return ALIAS_CALLOUT[minuscula] ?? minuscula;
}

export function limpiarTitulo(texto: string) {
  return texto
    .replace(/\[\[([^\]|]*)\|([^\]]*)\]\]/g, "$2")
    .replace(/\[\[([^\]]*)\]\]/g, "$1")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/(\*\*|__|~~|==|`)/g, "")
    .replace(/\*(?=\S)([^*]+?)(?<=\S)\*/g, "$1")
    .replace(/(?<![\p{L}\p{N}])_(?=\S)([^_]+?)(?<=\S)_(?![\p{L}\p{N}])/gu, "$1")
    .trim();
}

function cercoDe(linea: string) {
  return /^\s*(`{3,}|~{3,})/.exec(linea)?.[1][0] ?? null;
}

export function quitarComentarios(texto: string) {
  if (!texto.includes("%%")) return texto;
  const salida: string[] = [];
  let tramo: string[] = [];
  let cerco: string | null = null;
  const vaciar = () => {
    if (tramo.length) salida.push(tramo.join("\n").replace(/%%[\s\S]*?%%/g, ""));
    tramo = [];
  };
  for (const linea of texto.split("\n")) {
    const marca = cercoDe(linea);
    if (marca && (!cerco || marca === cerco)) {
      if (!cerco) vaciar();
      cerco = cerco ? null : marca;
      salida.push(linea);
    } else if (cerco) {
      salida.push(linea);
    } else {
      tramo.push(linea);
    }
  }
  vaciar();
  return salida.join("\n");
}

export function extraerSeccion(cuerpo: string, seccion: string) {
  const objetivo = seccion.trim().toLowerCase();
  const lineas = cuerpo.split("\n");
  let cerco: string | null = null;
  let nivel = 0;
  const resultado: string[] = [];
  for (const linea of lineas) {
    const marca = cercoDe(linea);
    if (marca && (!cerco || marca === cerco)) cerco = cerco ? null : marca;
    const titulo = cerco ? null : REGEX_TITULO.exec(linea);
    if (nivel === 0) {
      if (titulo && titulo[2].trim().toLowerCase() === objetivo) {
        nivel = titulo[1].length;
        resultado.push(linea);
      }
      continue;
    }
    if (titulo && titulo[1].length <= nivel) break;
    resultado.push(linea);
  }
  return resultado.join("\n");
}

function nodoTexto(value: string): NodoMd {
  return { type: "text", value };
}

function nodoEnlace(embed: boolean, interior: string): NodoMd {
  const enlace = enlaceDesdeInterior(interior, embed);
  return {
    type: "wikilink",
    data: {
      hName: "wikilink-memorias",
      hProperties: {
        destino: enlace.destino,
        seccion: enlace.seccion ?? "",
        alias: enlace.alias ?? "",
        embed: embed ? "si" : "no",
      },
    },
    children: [],
  };
}

function dividirTexto(valor: string): NodoMd[] | null {
  const nodos: NodoMd[] = [];
  let ultimo = 0;
  for (const coincidencia of valor.matchAll(REGEX_INLINE)) {
    const indice = coincidencia.index ?? 0;
    if (indice > ultimo) nodos.push(nodoTexto(valor.slice(ultimo, indice)));
    if (coincidencia[2] !== undefined) {
      nodos.push(nodoEnlace(coincidencia[1] === "!", coincidencia[2]));
    } else if (coincidencia[3] !== undefined) {
      nodos.push({
        type: "resaltado",
        data: { hName: "mark" },
        children: [nodoTexto(coincidencia[3])],
      });
    } else {
      nodos.push({
        type: "etiqueta",
        data: { hName: "etiqueta-memorias", hProperties: { nombre: coincidencia[4] } },
        children: [nodoTexto(`#${coincidencia[4]}`)],
      });
    }
    ultimo = indice + coincidencia[0].length;
  }
  if (nodos.length === 0) return null;
  if (ultimo < valor.length) nodos.push(nodoTexto(valor.slice(ultimo)));
  return nodos;
}

function esEmbed(nodo: NodoMd) {
  const propiedades = nodo.data?.hProperties as Record<string, string> | undefined;
  return nodo.type === "wikilink" && propiedades?.embed === "si";
}

function soloEmbeds(parrafo: NodoMd) {
  const hijos = parrafo.children ?? [];
  const embeds = hijos.filter(esEmbed);
  const resto = hijos.filter((hijo) => !esEmbed(hijo));
  return (
    embeds.length > 0 &&
    resto.every((hijo) => hijo.type === "text" && !(hijo.value ?? "").trim())
  );
}

function comoBloque(embed: NodoMd): NodoMd {
  const propiedades = embed.data?.hProperties as Record<string, string>;
  return { ...embed, data: { ...embed.data, hProperties: { ...propiedades, bloque: "si" } } };
}

function transformarInline(nodo: NodoMd) {
  if (!nodo.children || NODOS_OPACOS.has(nodo.type)) return;
  const hijos: NodoMd[] = [];
  for (const hijo of nodo.children) {
    if (hijo.type === "text" && typeof hijo.value === "string") {
      hijos.push(...(dividirTexto(hijo.value) ?? [hijo]));
    } else if (hijo.type === "html" && /^<br\s*\/?>$/i.test((hijo.value ?? "").trim())) {
      hijos.push({ type: "break" });
    } else {
      transformarInline(hijo);
      if (hijo.type === "paragraph" && soloEmbeds(hijo)) {
        hijos.push(...(hijo.children ?? []).filter(esEmbed).map(comoBloque));
      } else {
        hijos.push(hijo);
      }
    }
  }
  nodo.children = hijos;
}

function comoCallout(cita: NodoMd): NodoMd | null {
  const [primero, ...resto] = cita.children ?? [];
  if (primero?.type !== "paragraph" || !primero.children?.length) return null;
  const [inicio, ...siguientes] = primero.children;
  if (inicio.type !== "text" || typeof inicio.value !== "string") return null;
  const coincidencia = REGEX_CALLOUT.exec(inicio.value);
  if (!coincidencia) return null;

  const [completa, tipoCrudo, signo, tituloCrudo] = coincidencia;
  const sobrante = inicio.value.slice(completa.length).replace(/^\n/, "");
  const parrafo: NodoMd[] = [...(sobrante ? [nodoTexto(sobrante)] : []), ...siguientes];
  const contenido: NodoMd[] = [
    ...(parrafo.length ? [{ ...primero, children: parrafo }] : []),
    ...resto,
  ];
  const tipo = tipoDeCallout(tipoCrudo);

  return {
    type: "callout",
    data: {
      hName: "callout-memorias",
      hProperties: {
        tipo,
        titulo: tituloCrudo.trim(),
        plegable: signo ? "si" : "no",
        abierto: signo === "-" ? "no" : "si",
      },
    },
    children: contenido,
  };
}

function procesarCallouts(nodo: NodoMd) {
  if (!nodo.children) return;
  nodo.children = nodo.children.map((hijo) =>
    hijo.type === "blockquote" ? (comoCallout(hijo) ?? hijo) : hijo,
  );
  nodo.children.forEach(procesarCallouts);
}

export function pluginObsidian() {
  return (arbol: NodoMd) => {
    procesarCallouts(arbol);
    transformarInline(arbol);
  };
}
