import type { ReactNode } from "react";
import styles from "./Conexiones.module.css";

type FilaAjusteProps = {
  titulo: string;
  descripcion?: ReactNode;
  apilada?: boolean;
  children?: ReactNode;
};

export function FilaAjuste({ titulo, descripcion, apilada, children }: FilaAjusteProps) {
  return (
    <div className={`${styles.fila} ${apilada ? styles.filaApilada : ""}`}>
      <div className={styles.filaTexto}>
        <div className={styles.filaTitulo}>{titulo}</div>
        {descripcion && <div className={styles.filaDescripcion}>{descripcion}</div>}
      </div>
      {children && <div className={styles.filaControl}>{children}</div>}
    </div>
  );
}

export function SeccionAjustes({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <section className={styles.seccion}>
      <h2 className={styles.seccionTitulo}>{titulo}</h2>
      <div className={styles.seccionCuerpo}>{children}</div>
    </section>
  );
}
