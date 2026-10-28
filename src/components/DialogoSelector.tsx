"use client";

import { useMemo, useState, type KeyboardEvent } from "react";
import { buscarRapido } from "@/lib/vault/busqueda";
import { IconoNota } from "./Icons";
import { TextoResaltado } from "./TextoResaltado";
import { useIndiceBusqueda } from "./useIndiceBusqueda";
import styles from "./DialogoSelector.module.css";

type DialogoSelectorProps = {
  clave: string;
  version: number;
  onElegir: (ruta: string) => void;
  onCerrar: () => void;
};

export function DialogoSelector({ clave, version, onElegir, onCerrar }: DialogoSelectorProps) {
  const { indice, cargando } = useIndiceBusqueda(clave, version, true);
  const [consulta, setConsulta] = useState("");
  const [marcada, setMarcada] = useState(0);
  const resultados = useMemo(() => (indice ? buscarRapido(indice, consulta) : []), [indice, consulta]);
  const hayConsulta = consulta.trim().length > 0;
  const posicion = Math.min(marcada, Math.max(resultados.length - 1, 0));

  function alTeclear(evento: KeyboardEvent) {
    if (evento.key === "Escape") {
      onCerrar();
    } else if (evento.key === "ArrowDown") {
      evento.preventDefault();
      setMarcada(Math.min(posicion + 1, resultados.length - 1));
    } else if (evento.key === "ArrowUp") {
      evento.preventDefault();
      setMarcada(Math.max(posicion - 1, 0));
    } else if (evento.key === "Enter" && resultados[posicion]) {
      evento.preventDefault();
      onElegir(resultados[posicion].ruta);
    }
  }

  return (
    <div className={styles.fondo} onClick={onCerrar} role="presentation">
      <div
        className={styles.dialogo}
        role="dialog"
        aria-label="Selector rápido"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={alTeclear}
      >
        <input
          className={styles.campo}
          value={consulta}
          onChange={(e) => {
            setConsulta(e.target.value);
            setMarcada(0);
          }}
          placeholder="Buscar nota por nombre"
          aria-label="Buscar nota por nombre"
          autoFocus
          autoCapitalize="none"
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
        />
        {cargando && <p className={styles.mensaje}>Preparando la búsqueda…</p>}
        {!cargando && !indice && <p className={styles.mensaje}>No se pudo preparar la búsqueda.</p>}
        {indice && !hayConsulta && <p className={styles.mensaje}>Escribe el nombre de una nota.</p>}
        {indice && hayConsulta && resultados.length === 0 && (
          <p className={styles.mensaje}>Ninguna nota coincide.</p>
        )}
        {resultados.length > 0 && (
          <ul className={styles.lista} role="listbox">
            {resultados.map((resultado, i) => (
              <li key={resultado.ruta} role="option" aria-selected={i === posicion}>
                <button
                  type="button"
                  className={`${styles.fila} ${i === posicion ? styles.filaMarcada : ""}`}
                  onClick={() => onElegir(resultado.ruta)}
                >
                  <span className={styles.icono}>
                    <IconoNota tamano={18} />
                  </span>
                  <span className={styles.textos}>
                    <span className={styles.titulo}>
                      <TextoResaltado texto={resultado.titulo} terminos={resultado.terminos} />
                    </span>
                    {resultado.carpeta && <span className={styles.carpeta}>{resultado.carpeta}</span>}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
