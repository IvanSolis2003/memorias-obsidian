"use client";

import {
  Children,
  createElement,
  isValidElement,
  type ComponentType,
  type ReactNode,
} from "react";
import ReactMarkdown, { type Components, type Options } from "react-markdown";
import rehypeHighlight from "rehype-highlight";
import remarkGfm from "remark-gfm";
import { pluginObsidian, quitarComentarios } from "@/lib/vault/markdown";
import { esAdjunto } from "@/lib/vault/tiposArchivo";
import { Callout } from "./Callout";
import { useContextoMarkdown } from "./ContextoMarkdown";
import { EnlaceAdjunto, EnlaceNota, EnlaceWiki } from "./EnlaceInterno";
import { ImagenVault } from "./ImagenVault";
import styles from "./Markdown.module.css";

type PropiedadesLibres = Record<string, unknown> & { children?: ReactNode };

const PLUGINS_REMARK = [remarkGfm, pluginObsidian] as unknown as Options["remarkPlugins"];
const PLUGINS_REHYPE = [[rehypeHighlight, { detect: false }]] as unknown as Options["rehypePlugins"];
const OPCIONES_REHYPE: Options["remarkRehypeOptions"] = {
  footnoteLabel: "Notas al pie",
  footnoteBackLabel: "Volver al texto",
};
const REGEX_ESQUEMA = /^[a-z][a-z0-9+.-]*:/i;

function sinNodo(propiedades: PropiedadesLibres) {
  return Object.fromEntries(Object.entries(propiedades).filter(([clave]) => clave !== "node"));
}

function textoDe(hijos: ReactNode): string {
  return Children.toArray(hijos)
    .map((hijo) => {
      if (typeof hijo === "string" || typeof hijo === "number") return String(hijo);
      if (isValidElement<{ children?: ReactNode }>(hijo)) return textoDe(hijo.props.children);
      return "";
    })
    .join("");
}

function crearTitulo(etiqueta: string): ComponentType<PropiedadesLibres> {
  return function Titulo(propiedades) {
    const contexto = useContextoMarkdown();
    const atributos =
      contexto.profundidad === 0
        ? { ...sinNodo(propiedades), "data-titulo": textoDe(propiedades.children) }
        : sinNodo(propiedades);
    return createElement(etiqueta, atributos, propiedades.children);
  };
}

function Etiqueta({ children }: PropiedadesLibres) {
  return <span className={styles.etiqueta}>{children}</span>;
}

function Vinculo(propiedades: PropiedadesLibres) {
  const href = typeof propiedades.href === "string" ? propiedades.href : "";
  const { children } = propiedades;
  if (!href) return <span>{children}</span>;
  if (href.startsWith("#")) return <a href={href}>{children}</a>;
  if (REGEX_ESQUEMA.test(href)) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer">
        {children}
      </a>
    );
  }
  let destino = href;
  try {
    destino = decodeURIComponent(href);
  } catch {}
  const [ruta, ...resto] = destino.split("#");
  if (esAdjunto(ruta)) return <EnlaceAdjunto destino={ruta}>{children}</EnlaceAdjunto>;
  return (
    <EnlaceNota destino={ruta.replace(/\.md$/i, "")} seccion={resto.join("#") || undefined}>
      {children}
    </EnlaceNota>
  );
}

function Imagen(propiedades: PropiedadesLibres) {
  const contexto = useContextoMarkdown();
  const src = typeof propiedades.src === "string" ? propiedades.src : "";
  const alt = typeof propiedades.alt === "string" ? propiedades.alt : "";
  const medidas = /\|(\d+)(?:x(\d+))?$/.exec(alt);
  const textoAlt = alt.replace(/\|\d+(?:x\d+)?$/, "");
  if (!src) return null;

  if (REGEX_ESQUEMA.test(src)) {
    return <img src={src} alt={textoAlt} loading="lazy" className={styles.imagen} />;
  }
  let destino = src;
  try {
    destino = decodeURIComponent(src);
  } catch {}
  const ruta = contexto.resolutor.resolverArchivo(destino, contexto.rutaActual);
  if (!ruta) return <span className={styles.inexistente}>{textoAlt || destino}</span>;
  return (
    <ImagenVault
      ruta={ruta}
      alt={textoAlt || undefined}
      ancho={medidas ? Number(medidas[1]) : undefined}
      alto={medidas?.[2] ? Number(medidas[2]) : undefined}
    />
  );
}

function Tabla({ children }: PropiedadesLibres) {
  return (
    <div className={styles.tabla}>
      <table>{children}</table>
    </div>
  );
}

const COMPONENTES = {
  "wikilink-memorias": EnlaceWiki,
  "etiqueta-memorias": Etiqueta,
  "callout-memorias": Callout,
  a: Vinculo,
  img: Imagen,
  table: Tabla,
  h1: crearTitulo("h1"),
  h2: crearTitulo("h2"),
  h3: crearTitulo("h3"),
  h4: crearTitulo("h4"),
  h5: crearTitulo("h5"),
  h6: crearTitulo("h6"),
} as unknown as Components;

export function NotaMarkdown({ texto }: { texto: string }) {
  return (
    <div className={styles.contenido}>
      <ReactMarkdown
        remarkPlugins={PLUGINS_REMARK}
        rehypePlugins={PLUGINS_REHYPE}
        remarkRehypeOptions={OPCIONES_REHYPE}
        components={COMPONENTES}
      >
        {quitarComentarios(texto)}
      </ReactMarkdown>
    </div>
  );
}
