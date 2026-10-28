import type { CSSProperties, ReactNode } from "react";
import { COLORES_CALLOUT, IconoCallout, TITULOS_CALLOUT } from "./IconoCallout";
import styles from "./Callout.module.css";

type CalloutProps = {
  tipo?: string;
  titulo?: string;
  plegable?: string;
  abierto?: string;
  children?: ReactNode;
};

function tituloPorDefecto(tipo: string) {
  return TITULOS_CALLOUT[tipo] ?? tipo.charAt(0).toUpperCase() + tipo.slice(1);
}

export function Callout({ tipo = "note", titulo, plegable, abierto, children }: CalloutProps) {
  const conocido = Object.hasOwn(COLORES_CALLOUT, tipo) ? tipo : "note";
  const estilo = { "--color-callout": COLORES_CALLOUT[conocido] } as CSSProperties;
  const cabecera = (
    <>
      <span className={styles.icono}>
        <IconoCallout tipo={conocido} />
      </span>
      <span className={styles.titulo}>{titulo || tituloPorDefecto(tipo)}</span>
    </>
  );

  if (plegable === "si") {
    return (
      <details className={styles.callout} style={estilo} open={abierto !== "no"}>
        <summary className={`${styles.cabecera} ${styles.plegable}`}>{cabecera}</summary>
        <div className={styles.contenido}>{children}</div>
      </details>
    );
  }

  return (
    <div className={styles.callout} style={estilo}>
      <div className={styles.cabecera}>{cabecera}</div>
      {children && <div className={styles.contenido}>{children}</div>}
    </div>
  );
}
