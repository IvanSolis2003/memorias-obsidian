"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import type { Resolutor } from "@/lib/vault/links";
import { separarFrontmatter } from "@/lib/vault/parse";
import { obtenerResolutor, obtenerTamanos } from "@/lib/vault/resolutor";
import { leerContenido, leerNota } from "@/lib/vault/store";
import type { NotaGuardada } from "@/lib/vault/tipos";
import { guardarUltimaNota } from "@/lib/vault/ultima";
import { rutaDeUrl } from "@/lib/vault/url";
import { useClaveVault, useVersionDatos } from "./ContextoVault";
import { useContextoEdicion } from "./edicion/ContextoEdicion";
import { EditorNota } from "./edicion/EditorNota";
import { ProveedorMarkdown } from "./visor/ContextoMarkdown";
import { NotaMarkdown } from "./visor/NotaMarkdown";
import { Propiedades } from "./visor/Propiedades";
import { irASeccion } from "./visor/seccion";
import styles from "./VisorNota.module.css";

type NotaCargada = {
  nota: NotaGuardada;
  cuerpo: string;
  resolutor: Resolutor;
  tamanos: Map<string, number>;
};

type Estado = { fase: "cargando" } | { fase: "faltante" } | { fase: "lista"; datos: NotaCargada };

function ContenidoNota({
  clave,
  ruta,
  version,
}: {
  clave: string | null;
  ruta: string;
  version: number;
}) {
  const [estado, setEstado] = useState<Estado>(clave ? { fase: "cargando" } : { fase: "faltante" });

  useEffect(() => {
    if (!clave) return;
    let activo = true;
    Promise.all([
      leerNota(clave, ruta),
      leerContenido(clave, ruta),
      obtenerResolutor(clave),
      obtenerTamanos(clave),
    ])
      .then(([nota, contenido, resolutor, tamanos]) => {
        if (!activo) return;
        if (!nota || contenido === undefined) return setEstado({ fase: "faltante" });
        setEstado({
          fase: "lista",
          datos: { nota, cuerpo: separarFrontmatter(contenido).cuerpo, resolutor, tamanos },
        });
      })
      .catch(() => {
        if (activo) setEstado({ fase: "faltante" });
      });
    return () => {
      activo = false;
    };
  }, [clave, ruta, version]);

  const lista = estado.fase === "lista";

  useEffect(() => {
    if (!clave || !lista) return;
    guardarUltimaNota(clave, ruta);
    const marca = window.location.hash.slice(1);
    if (!marca) return;
    try {
      irASeccion(decodeURIComponent(marca));
    } catch {}
  }, [clave, ruta, lista]);

  if (estado.fase === "cargando") return null;
  if (estado.fase === "faltante" || !clave) {
    return (
      <p className={styles.aviso}>
        Esta nota no está guardada en este dispositivo. Usa Actualizar en el menú ⋯ para descargarla.
      </p>
    );
  }

  const { nota, cuerpo, resolutor, tamanos } = estado.datos;
  return (
    <article className={styles.nota}>
      <h1 className={styles.titulo}>{nota.titulo}</h1>
      <Propiedades propiedades={nota.propiedades} />
      <ProveedorMarkdown
        valor={{ clave, rutaActual: ruta, resolutor, tamanos, profundidad: 0, visitadas: [ruta] }}
      >
        <NotaMarkdown texto={cuerpo} />
      </ProveedorMarkdown>
    </article>
  );
}

export function VisorNota() {
  const ruta = rutaDeUrl(usePathname());
  const clave = useClaveVault();
  const version = useVersionDatos();
  const edicion = useContextoEdicion();
  if (!ruta) return null;
  if (edicion.modo === "edicion") return <EditorNota />;
  return <ContenidoNota key={`${clave}|${ruta}`} clave={clave} ruta={ruta} version={version} />;
}
