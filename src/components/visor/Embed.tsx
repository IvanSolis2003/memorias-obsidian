"use client";

import { useEffect, useState } from "react";
import { extraerSeccion } from "@/lib/vault/markdown";
import { separarFrontmatter } from "@/lib/vault/parse";
import { leerContenido } from "@/lib/vault/store";
import { esAdjunto, extensionDe } from "@/lib/vault/tiposArchivo";
import { Adjunto } from "./Adjunto";
import { ProveedorMarkdown, useContextoMarkdown } from "./ContextoMarkdown";
import { EnlaceNota } from "./EnlaceInterno";
import { ImagenVault } from "./ImagenVault";
import { NotaMarkdown } from "./NotaMarkdown";
import styles from "./Markdown.module.css";

const PROFUNDIDAD_MAXIMA = 2;
const EXTENSIONES_IMAGEN = new Set(["png", "jpg", "jpeg", "gif", "webp", "svg", "avif", "bmp"]);

type EmbedProps = {
  destino: string;
  seccion?: string;
  alias?: string;
  bloque: boolean;
};

function EmbedDeNota({ ruta, seccion }: { ruta: string; seccion?: string }) {
  const contexto = useContextoMarkdown();
  const [texto, setTexto] = useState<string | null | undefined>(undefined);

  useEffect(() => {
    let activo = true;
    leerContenido(contexto.clave, ruta)
      .then((contenido) => {
        if (!activo) return;
        if (contenido === undefined) return setTexto(null);
        const { cuerpo } = separarFrontmatter(contenido);
        setTexto(seccion ? extraerSeccion(cuerpo, seccion) : cuerpo);
      })
      .catch(() => {
        if (activo) setTexto(null);
      });
    return () => {
      activo = false;
    };
  }, [contexto.clave, ruta, seccion]);

  if (texto === undefined) return <div className={styles.embedCargando}>Cargando…</div>;
  if (texto === null || !texto.trim()) {
    return <div className={styles.embedCargando}>No se pudo mostrar el contenido incrustado.</div>;
  }

  return (
    <div className={styles.embed}>
      <div className={styles.embedTitulo}>
        <EnlaceNota destino={ruta} seccion={seccion}>
          {ruta.split("/").pop()?.replace(/\.md$/i, "")}
        </EnlaceNota>
      </div>
      <ProveedorMarkdown
        valor={{
          ...contexto,
          rutaActual: ruta,
          profundidad: contexto.profundidad + 1,
          visitadas: [...contexto.visitadas, ruta],
        }}
      >
        <NotaMarkdown texto={texto} />
      </ProveedorMarkdown>
    </div>
  );
}

export function Embed({ destino, seccion, alias, bloque }: EmbedProps) {
  const contexto = useContextoMarkdown();
  const extension = extensionDe(destino);

  if (esAdjunto(destino)) {
    const ruta = contexto.resolutor.resolverArchivo(destino, contexto.rutaActual);
    if (!ruta) {
      return <span className={styles.inexistente}>{destino}</span>;
    }
    if (EXTENSIONES_IMAGEN.has(extension)) {
      const medidas = /^(\d+)(?:x(\d+))?$/.exec(alias ?? "");
      return (
        <ImagenVault
          ruta={ruta}
          ancho={medidas ? Number(medidas[1]) : undefined}
          alto={medidas?.[2] ? Number(medidas[2]) : undefined}
        />
      );
    }
    return <Adjunto ruta={ruta} />;
  }

  const ruta = contexto.resolutor.resolverNota(destino, contexto.rutaActual);
  if (!ruta) return <span className={styles.inexistente}>{destino}</span>;

  const puedeIncrustar =
    bloque && contexto.profundidad < PROFUNDIDAD_MAXIMA && !contexto.visitadas.includes(ruta);
  if (!puedeIncrustar) {
    return (
      <EnlaceNota destino={destino} seccion={seccion}>
        {destino}
      </EnlaceNota>
    );
  }
  return <EmbedDeNota ruta={ruta} seccion={seccion} />;
}
