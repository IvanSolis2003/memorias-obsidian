"use client";

import { IconoNota } from "../Icons";
import type { OrigenAdjunto } from "@/lib/vault/subir";
import styles from "./Edicion.module.css";

export type EstadoAdjunto =
  | { fase: "subiendo"; nombre: string }
  | { fase: "listo"; nombre: string; vistaPrevia: string | null }
  | { fase: "error"; mensaje: string };

type MenuAdjuntarProps = {
  onElegir: (origen: OrigenAdjunto) => void;
};

const OPCIONES: { origen: OrigenAdjunto; etiqueta: string }[] = [
  { origen: "camara", etiqueta: "Cámara" },
  { origen: "fotos", etiqueta: "Fotos" },
  { origen: "archivo", etiqueta: "Archivo" },
];

export function MenuAdjuntar({ onElegir }: MenuAdjuntarProps) {
  return (
    <div className={styles.menuAdjuntar} role="menu" aria-label="Adjuntar">
      {OPCIONES.map((opcion) => (
        <button
          key={opcion.origen}
          type="button"
          role="menuitem"
          className={styles.opcionAdjuntar}
          onClick={() => onElegir(opcion.origen)}
        >
          {opcion.etiqueta}
        </button>
      ))}
    </div>
  );
}

type AvisoAdjuntoProps = {
  estado: EstadoAdjunto;
  onCerrar: () => void;
};

export function AvisoAdjunto({ estado, onCerrar }: AvisoAdjuntoProps) {
  return (
    <div className={styles.avisoAdjunto} role="status">
      <div className={styles.avisoAdjuntoCuerpo}>
        {estado.fase === "listo" &&
          (estado.vistaPrevia ? (
            <img src={estado.vistaPrevia} alt="" className={styles.vistaPrevia} />
          ) : (
            <span className={styles.chip}>
              <IconoNota tamano={16} />
              {estado.nombre}
            </span>
          ))}
        <span className={estado.fase === "error" ? styles.errorAdjunto : undefined}>
          {estado.fase === "subiendo" && `Subiendo «${estado.nombre}»…`}
          {estado.fase === "listo" &&
            `Adjuntado «${estado.nombre}». Pulsa Guardar para conservar el enlace en la nota.`}
          {estado.fase === "error" && estado.mensaje}
        </span>
      </div>
      {estado.fase !== "subiendo" && (
        <button type="button" className={styles.avisoBoton} onClick={onCerrar}>
          Cerrar
        </button>
      )}
    </div>
  );
}
