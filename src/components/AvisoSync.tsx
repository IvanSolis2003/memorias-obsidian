"use client";

import type { EstadoSync } from "./useSincronizacion";
import styles from "./AvisoSync.module.css";

type AvisoSyncProps = {
  estado: EstadoSync;
  onCerrar: () => void;
  onReintentar: () => void;
};

function plural(cantidad: number, singular: string, pluralizado: string) {
  return `${cantidad} ${cantidad === 1 ? singular : pluralizado}`;
}

export function AvisoSync({ estado, onCerrar, onReintentar }: AvisoSyncProps) {
  if (estado.fase === "inactivo") return null;

  if (estado.fase === "sincronizando") {
    const { hechas, total } = estado.progreso;
    return (
      <div className={styles.aviso} role="status">
        <div className={styles.texto}>
          {total > 0 ? `Actualizando… ${hechas} de ${total} notas` : "Buscando cambios…"}
        </div>
        {total > 0 && (
          <div className={styles.barra}>
            <div className={styles.progreso} style={{ width: `${(hechas / total) * 100}%` }} />
          </div>
        )}
      </div>
    );
  }

  let mensaje: string;
  let reintentar = false;
  if (estado.fase === "listo") {
    const { resultado } = estado;
    if (resultado.fallidas > 0) {
      mensaje = `${plural(resultado.fallidas, "nota no se pudo descargar", "notas no se pudieron descargar")}. Intenta de nuevo.`;
      reintentar = true;
    } else if (resultado.sinCambios) {
      mensaje = "Todo está al día.";
    } else {
      const partes = [`${plural(resultado.descargadas, "nota actualizada", "notas actualizadas")}`];
      if (resultado.eliminadas > 0) {
        partes.push(plural(resultado.eliminadas, "eliminada", "eliminadas"));
      }
      mensaje = `Actualizado: ${partes.join(", ")}.`;
    }
    if (resultado.truncado) mensaje += " GitHub entregó una lista incompleta de archivos.";
  } else if (estado.fase === "sin-conexion") {
    mensaje = "Sin conexión. Se usan las notas guardadas en este dispositivo.";
  } else {
    mensaje = estado.mensaje;
    reintentar = true;
  }

  return (
    <div className={styles.aviso} role="status">
      <div className={styles.texto}>{mensaje}</div>
      <div className={styles.acciones}>
        {reintentar && (
          <button type="button" className={styles.boton} onClick={onReintentar}>
            Reintentar
          </button>
        )}
        <button type="button" className={styles.boton} onClick={onCerrar}>
          Cerrar
        </button>
      </div>
    </div>
  );
}
