"use client";

import { esAudio, formatearTamano } from "@/lib/vault/attachments";
import { extensionDe } from "@/lib/vault/tiposArchivo";
import { urlDeAsset } from "@/lib/vault/url";
import { IconoNota } from "../Icons";
import { useContextoMarkdown } from "./ContextoMarkdown";
import styles from "./Adjunto.module.css";

export function Adjunto({ ruta }: { ruta: string }) {
  const contexto = useContextoMarkdown();
  const extension = extensionDe(ruta);
  const url = urlDeAsset(ruta);
  const nombre = ruta.split("/").pop() ?? ruta;
  const tamano = contexto.tamanos.get(ruta);

  if (extension === "pdf") {
    return (
      <span className={styles.pdf}>
        <iframe src={url} title={nombre} className={styles.marco} />
        <a className={styles.abrir} href={url} target="_blank" rel="noopener noreferrer">
          Abrir «{nombre}» en pestaña nueva
        </a>
      </span>
    );
  }

  if (esAudio(extension)) {
    return (
      <span className={styles.audio}>
        <span className={styles.nombre}>{nombre}</span>
        <audio controls preload="none" src={url} className={styles.reproductor} />
      </span>
    );
  }

  return (
    <a className={styles.tarjeta} href={url} download={nombre}>
      <span className={styles.icono}>
        <IconoNota tamano={22} />
      </span>
      <span className={styles.datos}>
        <span className={styles.nombre}>{nombre}</span>
        <span className={styles.detalle}>
          {extension.toUpperCase()}
          {tamano !== undefined ? ` · ${formatearTamano(tamano)}` : ""}
        </span>
      </span>
      <span className={styles.descargar}>Descargar</span>
    </a>
  );
}
