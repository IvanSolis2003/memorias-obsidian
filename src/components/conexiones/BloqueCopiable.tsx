"use client";

import { useState } from "react";
import { FilaAjuste } from "./FilaAjuste";
import styles from "./Conexiones.module.css";

type BloqueCopiableProps = {
  titulo: string;
  descripcion: string;
  texto: string;
};

export function BloqueCopiable({ titulo, descripcion, texto }: BloqueCopiableProps) {
  const [copiado, setCopiado] = useState(false);

  async function copiar() {
    try {
      await navigator.clipboard.writeText(texto);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 1500);
    } catch {
      setCopiado(false);
    }
  }

  return (
    <FilaAjuste titulo={titulo} descripcion={descripcion} apilada>
      <div className={styles.bloque}>
        <pre className={styles.codigo}>{texto}</pre>
        <button type="button" className={styles.botonSecundario} onClick={copiar}>
          {copiado ? "Copiado" : "Copiar"}
        </button>
      </div>
    </FilaAjuste>
  );
}
