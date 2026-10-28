import { resaltar } from "@/lib/vault/busqueda";
import styles from "./TextoResaltado.module.css";

type TextoResaltadoProps = {
  texto: string;
  terminos: string[];
};

export function TextoResaltado({ texto, terminos }: TextoResaltadoProps) {
  return resaltar(texto, terminos).map((segmento, i) =>
    segmento.marca ? (
      <mark key={i} className={styles.marca}>
        {segmento.texto}
      </mark>
    ) : (
      segmento.texto
    ),
  );
}
