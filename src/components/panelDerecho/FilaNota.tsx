import Link from "next/link";
import { urlDeNota } from "@/lib/vault/url";
import { IconoNota } from "../Icons";
import styles from "./PanelDerecho.module.css";

type FilaNotaProps = {
  ruta: string;
  titulo?: string;
  onNavegar: () => void;
};

export function FilaNota({ ruta, titulo, onNavegar }: FilaNotaProps) {
  const corte = ruta.lastIndexOf("/");
  const nombre = titulo ?? ruta.slice(corte + 1).replace(/\.md$/i, "");

  return (
    <li>
      <Link href={urlDeNota(ruta)} className={styles.fila} onClick={onNavegar}>
        <span className={styles.icono}>
          <IconoNota tamano={18} />
        </span>
        <span className={styles.textos}>
          <span className={styles.titulo}>{nombre}</span>
          {corte !== -1 && <span className={styles.carpeta}>{ruta.slice(0, corte)}</span>}
        </span>
      </Link>
    </li>
  );
}
