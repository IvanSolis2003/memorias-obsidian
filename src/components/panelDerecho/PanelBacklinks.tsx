import type { DatosNota } from "../useDatosNota";
import { FilaNota } from "./FilaNota";
import styles from "./PanelDerecho.module.css";

type PanelProps = {
  datos: DatosNota | null;
  onNavegar: () => void;
};

export function PanelBacklinks({ datos, onNavegar }: PanelProps) {
  if (!datos) return <p className={styles.vacio}>Abre una nota para ver qué notas la enlazan.</p>;
  if (datos.entrantes.length === 0) {
    return <p className={styles.vacio}>Ninguna otra nota enlaza a esta nota.</p>;
  }
  return (
    <>
      <p className={styles.contador}>
        {datos.entrantes.length} {datos.entrantes.length === 1 ? "nota enlaza" : "notas enlazan"} aquí
      </p>
      <ul className={styles.lista}>
        {datos.entrantes.map((entrante) => (
          <FilaNota
            key={entrante.ruta}
            ruta={entrante.ruta}
            titulo={entrante.titulo}
            onNavegar={onNavegar}
          />
        ))}
      </ul>
    </>
  );
}
