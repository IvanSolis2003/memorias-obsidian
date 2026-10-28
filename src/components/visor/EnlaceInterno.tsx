"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { esAdjunto } from "@/lib/vault/tiposArchivo";
import { urlDeAsset, urlDeNota } from "@/lib/vault/url";
import { useContextoMarkdown } from "./ContextoMarkdown";
import { Embed } from "./Embed";
import { irASeccion } from "./seccion";
import styles from "./Markdown.module.css";

type EnlaceNotaProps = {
  destino: string;
  seccion?: string;
  children: ReactNode;
};

export function EnlaceNota({ destino, seccion, children }: EnlaceNotaProps) {
  const contexto = useContextoMarkdown();
  const ruta = contexto.resolutor.resolverNota(destino, contexto.rutaActual);

  if (!ruta) {
    return (
      <span className={styles.inexistente} title="Esta nota no existe en el vault">
        {children}
      </span>
    );
  }

  const href = urlDeNota(ruta) + (seccion ? `#${encodeURIComponent(seccion)}` : "");
  const enLaMisma = ruta === contexto.rutaActual && contexto.profundidad === 0;

  return (
    <Link
      href={href}
      className={styles.interno}
      onClick={(evento) => {
        if (enLaMisma && seccion) {
          evento.preventDefault();
          irASeccion(seccion);
        }
      }}
    >
      {children}
    </Link>
  );
}

export function EnlaceAdjunto({ destino, children }: { destino: string; children: ReactNode }) {
  const contexto = useContextoMarkdown();
  const ruta = contexto.resolutor.resolverArchivo(destino, contexto.rutaActual);

  if (!ruta) {
    return (
      <span className={styles.inexistente} title="Este archivo no existe en el vault">
        {children}
      </span>
    );
  }
  return (
    <a className={styles.interno} href={urlDeAsset(ruta)} target="_blank" rel="noopener noreferrer">
      {children}
    </a>
  );
}

type EnlaceWikiProps = {
  destino?: string;
  seccion?: string;
  alias?: string;
  embed?: string;
  bloque?: string;
};

export function EnlaceWiki({ destino = "", seccion, alias, embed, bloque }: EnlaceWikiProps) {
  if (embed === "si") {
    return <Embed destino={destino} seccion={seccion || undefined} alias={alias} bloque={bloque === "si"} />;
  }
  const texto = alias || (destino ? destino + (seccion ? ` > ${seccion}` : "") : (seccion ?? ""));
  if (esAdjunto(destino)) return <EnlaceAdjunto destino={destino}>{texto}</EnlaceAdjunto>;
  return (
    <EnlaceNota destino={destino} seccion={seccion || undefined}>
      {texto}
    </EnlaceNota>
  );
}
