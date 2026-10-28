"use client";

import type { SugerenciaEnlace } from "@/lib/vault/links";
import { IconoNota } from "../Icons";
import styles from "./Edicion.module.css";

type SugerenciasProps = {
  sugerencias: SugerenciaEnlace[];
  onElegir: (sugerencia: SugerenciaEnlace) => void;
};

export function Sugerencias({ sugerencias, onElegir }: SugerenciasProps) {
  if (sugerencias.length === 0) return null;

  return (
    <ul className={styles.sugerencias} role="listbox" aria-label="Notas del vault">
      {sugerencias.map((sugerencia) => (
        <li key={sugerencia.ruta}>
          <button
            type="button"
            className={styles.sugerencia}
            role="option"
            aria-selected={false}
            onPointerDown={(evento) => evento.preventDefault()}
            onClick={() => onElegir(sugerencia)}
          >
            <IconoNota tamano={16} />
            <span>{sugerencia.texto}</span>
          </button>
        </li>
      ))}
    </ul>
  );
}
