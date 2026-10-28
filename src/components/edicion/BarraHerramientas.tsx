"use client";

import type { ReactNode, RefObject } from "react";
import { IconoClip } from "../Icons";
import type { ManoEditor } from "./EditorMarkdown";
import styles from "./Edicion.module.css";

type BarraHerramientasProps = {
  editor: RefObject<ManoEditor | null>;
  top: string;
  adjuntarDeshabilitado: boolean;
  onAdjuntar: () => void;
};

type Herramienta = {
  etiqueta: string;
  contenido: ReactNode;
  accion: (editor: ManoEditor) => void;
};

const HERRAMIENTAS: Herramienta[] = [
  { etiqueta: "Negrita", contenido: <strong>B</strong>, accion: (e) => e.envolver("**") },
  { etiqueta: "Cursiva", contenido: <em>I</em>, accion: (e) => e.envolver("*") },
  { etiqueta: "Enlace a nota", contenido: "[[ ]]", accion: (e) => e.insertar("[[]]", 2) },
  { etiqueta: "Lista", contenido: "•", accion: (e) => e.prefijarLinea("- ") },
  { etiqueta: "Tarea", contenido: "☐", accion: (e) => e.prefijarLinea("- [ ] ") },
  { etiqueta: "Título", contenido: "H", accion: (e) => e.alternarTitulo() },
  { etiqueta: "Etiqueta", contenido: "#", accion: (e) => e.insertar("#") },
];

export function BarraHerramientas({
  editor,
  top,
  adjuntarDeshabilitado,
  onAdjuntar,
}: BarraHerramientasProps) {
  return (
    <div
      className={styles.herramientas}
      style={{ top }}
      role="toolbar"
      aria-label="Herramientas de edición"
    >
      {HERRAMIENTAS.map((herramienta) => (
        <button
          key={herramienta.etiqueta}
          type="button"
          className={styles.herramienta}
          aria-label={herramienta.etiqueta}
          onPointerDown={(evento) => evento.preventDefault()}
          onClick={() => editor.current && herramienta.accion(editor.current)}
        >
          {herramienta.contenido}
        </button>
      ))}
      <button
        type="button"
        className={styles.herramienta}
        aria-label="Adjuntar"
        disabled={adjuntarDeshabilitado}
        onPointerDown={(evento) => evento.preventDefault()}
        onClick={onAdjuntar}
      >
        <IconoClip tamano={20} />
      </button>
    </div>
  );
}
