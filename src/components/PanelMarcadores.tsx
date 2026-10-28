"use client";

import { useEffect, useMemo, useState } from "react";
import { listarNotas } from "@/lib/vault/store";
import { agruparPorTag, type NotaConTags } from "@/lib/vault/tags";
import { FilaNota } from "./panelDerecho/FilaNota";
import styles from "./panelDerecho/PanelDerecho.module.css";
import estilosTags from "./PanelMarcadores.module.css";

type PanelMarcadoresProps = {
  clave: string | null;
  version: number;
  marcadores: string[];
  onNavegar: () => void;
};

export function PanelMarcadores({ clave, version, marcadores, onNavegar }: PanelMarcadoresProps) {
  const [notas, setNotas] = useState<NotaConTags[] | null>(null);
  const [abierto, setAbierto] = useState<string | null>(null);

  useEffect(() => {
    if (!clave) return;
    let activo = true;
    listarNotas(clave)
      .then((guardadas) => {
        if (activo) setNotas(guardadas.map(({ ruta, titulo, tags }) => ({ ruta, titulo, tags })));
      })
      .catch(() => {
        if (activo) setNotas([]);
      });
    return () => {
      activo = false;
    };
  }, [clave, version]);

  const grupos = useMemo(() => agruparPorTag(notas ?? []), [notas]);
  const titulos = useMemo(() => new Map((notas ?? []).map((nota) => [nota.ruta, nota.titulo])), [notas]);
  const marcadasExistentes = notas ? marcadores.filter((ruta) => titulos.has(ruta)) : [];

  if (!clave) return <p className={styles.vacio}>Conecta un vault para ver tus marcadores y tags.</p>;
  if (!notas) return <p className={styles.vacio}>Cargando…</p>;

  return (
    <>
      <h3 className={styles.encabezadoSeccion}>Marcadores</h3>
      {marcadasExistentes.length === 0 ? (
        <p className={styles.vacio}>Abre una nota y usa ⋯ → «Marcar nota» para guardarla aquí.</p>
      ) : (
        <ul className={styles.lista}>
          {marcadasExistentes.map((ruta) => (
            <FilaNota key={ruta} ruta={ruta} titulo={titulos.get(ruta)} onNavegar={onNavegar} />
          ))}
        </ul>
      )}

      <h3 className={styles.encabezadoSeccion}>Tags</h3>
      {grupos.length === 0 ? (
        <p className={styles.vacio}>Ninguna nota tiene tags todavía. Usa #etiqueta en el texto o tags en las propiedades.</p>
      ) : (
        <ul className={styles.lista}>
          {grupos.map((grupo) => {
            const desplegado = abierto === grupo.tag;
            return (
              <li key={grupo.tag}>
                <button
                  type="button"
                  className={estilosTags.tag}
                  aria-expanded={desplegado}
                  onClick={() => setAbierto(desplegado ? null : grupo.tag)}
                >
                  <span className={styles.etiqueta}>#{grupo.tag}</span>
                  <span className={estilosTags.cantidad}>{grupo.notas.length}</span>
                </button>
                {desplegado && (
                  <ul className={styles.lista}>
                    {grupo.notas.map((nota) => (
                      <FilaNota key={nota.ruta} ruta={nota.ruta} titulo={nota.titulo} onNavegar={onNavegar} />
                    ))}
                  </ul>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
