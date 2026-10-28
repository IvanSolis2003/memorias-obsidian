"use client";

import { fechaLegible } from "@/lib/tiempo";
import styles from "./DialogoActualizaciones.module.css";

type DialogoActualizacionesProps = {
  vacio: boolean;
  ultimaActualizacion: string | null;
  onAceptar: () => void;
  onRechazar: () => void;
};

export function DialogoActualizaciones({
  vacio,
  ultimaActualizacion,
  onAceptar,
  onRechazar,
}: DialogoActualizacionesProps) {
  return (
    <div className={styles.fondo} role="presentation">
      <div className={styles.dialogo} role="alertdialog" aria-labelledby="titulo-actualizaciones">
        <h2 id="titulo-actualizaciones" className={styles.titulo}>
          {vacio ? "¿Descargar el vault?" : "¿Buscar actualizaciones?"}
        </h2>
        <p className={styles.texto}>
          {vacio
            ? "Aún no hay notas guardadas en este dispositivo. Descargarlas puede tardar un poco la primera vez."
            : ultimaActualizacion
              ? `Última actualización: ${fechaLegible(ultimaActualizacion)}.`
              : "Todavía no se ha actualizado."}
        </p>
        <div className={styles.acciones}>
          <button type="button" className={styles.secundario} onClick={onRechazar}>
            Ahora no
          </button>
          <button type="button" className={styles.primario} onClick={onAceptar}>
            {vacio ? "Descargar vault" : "Buscar ahora"}
          </button>
        </div>
      </div>
    </div>
  );
}
