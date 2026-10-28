"use client";

import { carpetaDeUrl, tituloDeUrl, type Pestana } from "@/lib/pestanas";
import { IconoMas, IconoNota } from "./Icons";
import styles from "./DialogoPestanas.module.css";

type DialogoPestanasProps = {
  pestanas: Pestana[];
  activa: string | null;
  onActivar: (id: string) => void;
  onCerrarPestana: (id: string) => void;
  onNueva: () => void;
  onCerrar: () => void;
};

export function DialogoPestanas({
  pestanas,
  activa,
  onActivar,
  onCerrarPestana,
  onNueva,
  onCerrar,
}: DialogoPestanasProps) {
  return (
    <div className={styles.fondo} onClick={onCerrar} role="presentation">
      <div
        className={styles.dialogo}
        role="dialog"
        aria-label="Pestañas abiertas"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className={styles.titulo}>
          {pestanas.length} {pestanas.length === 1 ? "pestaña" : "pestañas"}
        </h2>
        <ul className={styles.lista}>
          {pestanas.map((pestana) => {
            const carpeta = carpetaDeUrl(pestana.url);
            return (
              <li
                key={pestana.id}
                className={`${styles.tarjeta} ${pestana.id === activa ? styles.tarjetaActiva : ""}`}
              >
                <button type="button" className={styles.abrir} onClick={() => onActivar(pestana.id)}>
                  <span className={styles.icono}>
                    <IconoNota tamano={18} />
                  </span>
                  <span className={styles.textos}>
                    <span className={styles.nombre}>{tituloDeUrl(pestana.url)}</span>
                    {carpeta && <span className={styles.carpeta}>{carpeta}</span>}
                  </span>
                </button>
                {pestanas.length > 1 && (
                  <button
                    type="button"
                    className={styles.cerrarPestana}
                    aria-label={`Cerrar pestaña ${tituloDeUrl(pestana.url)}`}
                    onClick={() => onCerrarPestana(pestana.id)}
                  >
                    ×
                  </button>
                )}
              </li>
            );
          })}
        </ul>
        <button type="button" className={styles.nueva} onClick={onNueva}>
          <IconoMas tamano={18} />
          Nueva pestaña
        </button>
      </div>
    </div>
  );
}
