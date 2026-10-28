import { limpiarTitulo } from "@/lib/vault/markdown";
import type { DatosNota } from "../useDatosNota";
import { irATitulo } from "../visor/seccion";
import styles from "./PanelDerecho.module.css";

type PanelProps = {
  datos: DatosNota | null;
  onNavegar: () => void;
};

export function PanelEsquema({ datos, onNavegar }: PanelProps) {
  if (!datos?.nota) return <p className={styles.vacio}>Abre una nota para ver su esquema.</p>;
  const { titulos } = datos.nota;
  if (titulos.length === 0) return <p className={styles.vacio}>Esta nota no tiene títulos.</p>;

  const vistos = new Map<string, number>();
  const filas = titulos.map((titulo) => {
    const texto = limpiarTitulo(titulo.texto);
    const clave = texto.toLowerCase();
    const ocurrencia = vistos.get(clave) ?? 0;
    vistos.set(clave, ocurrencia + 1);
    return { nivel: titulo.nivel, texto, ocurrencia };
  });

  return (
    <ul className={styles.lista}>
      {filas.map((fila, indice) => (
        <li key={indice}>
          <button
            type="button"
            className={styles.fila}
            style={{ paddingLeft: `${8 + (fila.nivel - 1) * 14}px` }}
            onClick={() => {
              onNavegar();
              irATitulo(fila.texto, fila.ocurrencia);
            }}
          >
            <span className={styles.titulo}>{fila.texto}</span>
          </button>
        </li>
      ))}
    </ul>
  );
}
