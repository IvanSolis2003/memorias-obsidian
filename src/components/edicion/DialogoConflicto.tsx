"use client";

import { useState } from "react";
import type { Conflicto } from "./useEdicion";
import styles from "./DialogoConflicto.module.css";

type DialogoConflictoProps = {
  conflicto: Conflicto;
  miTexto: string;
  onSobrescribir: () => void;
  onCerrar: () => void;
};

type Vista = "opciones" | "remota" | "confirmar";

export function DialogoConflicto({
  conflicto,
  miTexto,
  onSobrescribir,
  onCerrar,
}: DialogoConflictoProps) {
  const [vista, setVista] = useState<Vista>("opciones");
  const [copiado, setCopiado] = useState(false);

  async function copiar() {
    try {
      await navigator.clipboard.writeText(miTexto);
      setCopiado(true);
    } catch {
      setCopiado(false);
    }
  }

  return (
    <div className={styles.fondo} role="presentation">
      <div className={styles.dialogo} role="alertdialog" aria-labelledby="titulo-conflicto">
        <h2 id="titulo-conflicto" className={styles.titulo}>
          {vista === "confirmar" ? "¿Sobrescribir la versión de GitHub?" : "La nota cambió en GitHub"}
        </h2>

        {vista === "opciones" && (
          <>
            <p className={styles.texto}>
              Alguien editó esta nota (por ejemplo desde el computador) después de que la descargaste.
              No se guardó nada para no perder esos cambios.
            </p>
            <div className={styles.acciones}>
              <button
                type="button"
                className={styles.secundario}
                onClick={() => setVista("remota")}
                disabled={conflicto.cargando}
              >
                {conflicto.cargando ? "Buscando versión remota…" : "Ver versión remota"}
              </button>
              <button type="button" className={styles.secundario} onClick={copiar}>
                {copiado ? "Texto copiado" : "Copiar mi texto"}
              </button>
              <button type="button" className={styles.peligro} onClick={() => setVista("confirmar")}>
                Sobrescribir
              </button>
              <button type="button" className={styles.primario} onClick={onCerrar}>
                Cancelar
              </button>
            </div>
          </>
        )}

        {vista === "remota" && (
          <>
            {conflicto.remota ? (
              <pre className={styles.remota}>{conflicto.remota.contenido}</pre>
            ) : (
              <p className={styles.texto}>
                La nota ya no existe en GitHub. Si sobrescribes, se creará de nuevo con tu texto.
              </p>
            )}
            <div className={styles.acciones}>
              <button type="button" className={styles.primario} onClick={() => setVista("opciones")}>
                Volver
              </button>
            </div>
          </>
        )}

        {vista === "confirmar" && (
          <>
            <p className={styles.texto}>
              Se reemplazará la versión que está en GitHub con tu texto. Los cambios hechos desde el
              computador en esta nota se perderán. Conviene copiar tu texto o ver la versión remota antes.
            </p>
            <div className={styles.acciones}>
              <button type="button" className={styles.secundario} onClick={() => setVista("opciones")}>
                Volver
              </button>
              <button type="button" className={styles.peligro} onClick={onSobrescribir}>
                Sí, sobrescribir
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
