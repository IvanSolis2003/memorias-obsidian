import { urlDeAsset } from "@/lib/vault/url";
import styles from "./Markdown.module.css";

type ImagenVaultProps = {
  ruta: string;
  alt?: string;
  ancho?: number;
  alto?: number;
};

export function ImagenVault({ ruta, alt, ancho, alto }: ImagenVaultProps) {
  return (
    <img
      src={urlDeAsset(ruta)}
      alt={alt ?? ruta.split("/").pop() ?? ""}
      width={ancho}
      height={alto}
      loading="lazy"
      className={styles.imagen}
    />
  );
}
