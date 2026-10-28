import { urlDeAsset } from "@/lib/vault/url";
import { IconoNota } from "../Icons";
import type { DatosNota } from "../useDatosNota";
import { FilaNota } from "./FilaNota";
import styles from "./PanelDerecho.module.css";

type PanelProps = {
  datos: DatosNota | null;
  onNavegar: () => void;
};

export function PanelSalientes({ datos, onNavegar }: PanelProps) {
  if (!datos) return <p className={styles.vacio}>Abre una nota para ver sus enlaces.</p>;
  if (datos.salientes.length === 0) return <p className={styles.vacio}>Esta nota no tiene enlaces.</p>;

  return (
    <ul className={styles.lista}>
      {datos.salientes.map((enlace) => {
        if (enlace.tipo === "nota" && enlace.ruta) {
          return <FilaNota key={enlace.ruta} ruta={enlace.ruta} onNavegar={onNavegar} />;
        }
        if (enlace.tipo === "archivo" && enlace.ruta) {
          return (
            <li key={enlace.ruta}>
              <a
                className={styles.fila}
                href={urlDeAsset(enlace.ruta)}
                target="_blank"
                rel="noopener noreferrer"
              >
                <span className={styles.icono}>
                  <IconoNota tamano={18} />
                </span>
                <span className={styles.titulo}>{enlace.ruta.split("/").pop()}</span>
              </a>
            </li>
          );
        }
        return (
          <li key={`?${enlace.destino}`}>
            <span className={`${styles.fila} ${styles.inexistente}`} title="Esta nota no existe en el vault">
              <span className={styles.icono}>
                <IconoNota tamano={18} />
              </span>
              <span className={styles.titulo}>{enlace.destino}</span>
            </span>
          </li>
        );
      })}
    </ul>
  );
}
