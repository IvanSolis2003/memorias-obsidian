import type { DatosNota } from "../useDatosNota";
import { ListaPropiedades } from "../visor/Propiedades";
import styles from "./PanelDerecho.module.css";

export function PanelPropiedades({ datos }: { datos: DatosNota | null }) {
  if (!datos?.nota) return <p className={styles.vacio}>Abre una nota para ver sus propiedades.</p>;
  const { propiedades, tags } = datos.nota;
  const hayPropiedades = Object.keys(propiedades).length > 0;

  if (!hayPropiedades && tags.length === 0) {
    return <p className={styles.vacio}>Esta nota no tiene propiedades ni etiquetas.</p>;
  }

  return (
    <>
      {hayPropiedades && <ListaPropiedades propiedades={propiedades} />}
      {tags.length > 0 && (
        <>
          <h3 className={styles.encabezadoSeccion}>Etiquetas</h3>
          <div className={styles.etiquetas}>
            {tags.map((tag) => (
              <span key={tag} className={styles.etiqueta}>
                #{tag}
              </span>
            ))}
          </div>
        </>
      )}
    </>
  );
}
