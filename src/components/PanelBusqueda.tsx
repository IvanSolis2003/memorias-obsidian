"use client";

import Link from "next/link";
import { useMemo } from "react";
import { buscar } from "@/lib/vault/busqueda";
import { urlDeNota } from "@/lib/vault/url";
import { IconoNota } from "./Icons";
import { TextoResaltado } from "./TextoResaltado";
import { useIndiceBusqueda } from "./useIndiceBusqueda";
import styles from "./PanelBusqueda.module.css";

type PanelBusquedaProps = {
  clave: string | null;
  version: number;
  consulta: string;
  onConsulta: (consulta: string) => void;
  onNavegar: () => void;
};

export function PanelBusqueda({ clave, version, consulta, onConsulta, onNavegar }: PanelBusquedaProps) {
  const { indice, cargando } = useIndiceBusqueda(clave, version, true);
  const resultados = useMemo(() => (indice ? buscar(indice, consulta) : []), [indice, consulta]);
  const hayConsulta = consulta.trim().length > 0;

  if (!clave) return <p className={styles.vacio}>Conecta un vault para buscar en tus notas.</p>;

  return (
    <div className={styles.panel}>
      <input
        type="search"
        className={styles.campo}
        value={consulta}
        onChange={(e) => onConsulta(e.target.value)}
        placeholder="Buscar en el vault"
        aria-label="Buscar en el vault"
        autoCapitalize="none"
        autoComplete="off"
        autoCorrect="off"
        spellCheck={false}
      />
      {cargando && <p className={styles.vacio}>Preparando la búsqueda…</p>}
      {!cargando && !indice && <p className={styles.vacio}>No se pudo preparar la búsqueda.</p>}
      {indice && !hayConsulta && (
        <p className={styles.vacio}>Escribe para buscar en títulos, rutas, etiquetas y contenido.</p>
      )}
      {indice && hayConsulta && resultados.length === 0 && (
        <p className={styles.vacio}>Sin resultados para «{consulta.trim()}».</p>
      )}
      {resultados.length > 0 && (
        <>
          <p className={styles.contador}>
            {resultados.length} {resultados.length === 1 ? "resultado" : "resultados"}
          </p>
          <ul className={styles.lista}>
            {resultados.map((resultado) => (
              <li key={resultado.ruta}>
                <Link href={urlDeNota(resultado.ruta)} className={styles.fila} onClick={onNavegar}>
                  <span className={styles.icono}>
                    <IconoNota tamano={18} />
                  </span>
                  <span className={styles.textos}>
                    <span className={styles.titulo}>
                      <TextoResaltado texto={resultado.titulo} terminos={resultado.terminos} />
                    </span>
                    {resultado.carpeta && <span className={styles.carpeta}>{resultado.carpeta}</span>}
                    {resultado.fragmento && (
                      <span className={styles.fragmento}>
                        <TextoResaltado texto={resultado.fragmento} terminos={resultado.terminos} />
                      </span>
                    )}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
