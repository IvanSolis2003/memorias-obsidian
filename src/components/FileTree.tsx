"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { carpetasAncestras, construirArbol, type NodoArbol } from "@/lib/vault/arbol";
import { urlDeNota } from "@/lib/vault/url";
import { carpetaDeRuta } from "@/lib/vault/nombres";
import { IconoCarpeta, IconoChevronDerecha, IconoMas, IconoNota } from "./Icons";
import styles from "./FileTree.module.css";

type FileTreeProps = {
  rutas: string[] | null;
  rutaActiva: string | null;
  onAbrir: () => void;
  onNuevaNota: (carpeta: string) => void;
};

type RamaProps = {
  nodos: NodoArbol[];
  nivel: number;
  expandidas: Set<string>;
  seleccionada: string;
  rutaActiva: string | null;
  onAlternar: (ruta: string) => void;
  onAbrir: () => void;
};

function Rama({
  nodos,
  nivel,
  expandidas,
  seleccionada,
  rutaActiva,
  onAlternar,
  onAbrir,
}: RamaProps) {
  const sangria = { paddingLeft: `${12 + nivel * 16}px` };

  return (
    <ul className={styles.lista}>
      {nodos.map((nodo) => {
        if (nodo.tipo === "nota") {
          const activa = nodo.ruta === rutaActiva;
          return (
            <li key={nodo.ruta}>
              <Link
                href={urlDeNota(nodo.ruta)}
                className={`${styles.fila} ${activa ? styles.activa : ""}`}
                style={sangria}
                aria-current={activa ? "page" : undefined}
                onClick={onAbrir}
              >
                <span className={styles.espacioChevron} />
                <IconoNota tamano={18} />
                <span className={styles.nombre}>{nodo.nombre}</span>
              </Link>
            </li>
          );
        }
        const abierta = expandidas.has(nodo.ruta);
        return (
          <li key={nodo.ruta}>
            <button
              type="button"
              className={`${styles.fila} ${nodo.ruta === seleccionada ? styles.seleccionada : ""}`}
              style={sangria}
              aria-expanded={abierta}
              onClick={() => onAlternar(nodo.ruta)}
            >
              <span className={`${styles.chevron} ${abierta ? styles.chevronAbierto : ""}`}>
                <IconoChevronDerecha tamano={16} />
              </span>
              <IconoCarpeta tamano={18} />
              <span className={styles.nombre}>{nodo.nombre}</span>
            </button>
            {abierta && (
              <Rama
                nodos={nodo.hijos}
                nivel={nivel + 1}
                expandidas={expandidas}
                seleccionada={seleccionada}
                rutaActiva={rutaActiva}
                onAlternar={onAlternar}
                onAbrir={onAbrir}
              />
            )}
          </li>
        );
      })}
    </ul>
  );
}

export function FileTree({ rutas, rutaActiva, onAbrir, onNuevaNota }: FileTreeProps) {
  const arbol = useMemo(() => construirArbol(rutas ?? []), [rutas]);
  const [expandidas, setExpandidas] = useState(() => new Set(carpetasAncestras(rutaActiva)));
  const [vista, setVista] = useState(rutaActiva);

  const [elegida, setElegida] = useState<string | null>(null);
  const seleccionada = elegida ?? carpetaDeRuta(rutaActiva);

  if (vista !== rutaActiva) {
    setVista(rutaActiva);
    setElegida(null);
    setExpandidas((actuales) => new Set([...actuales, ...carpetasAncestras(rutaActiva)]));
  }

  function alternar(ruta: string) {
    setElegida(ruta);
    setExpandidas((actuales) => {
      const siguientes = new Set(actuales);
      if (!siguientes.delete(ruta)) siguientes.add(ruta);
      return siguientes;
    });
  }

  if (rutas === null) return <p className={styles.vacio}>Cargando notas…</p>;

  return (
    <div>
      <button
        type="button"
        className={styles.nuevaNota}
        aria-label="Nueva nota"
        onClick={() => onNuevaNota(seleccionada)}
      >
        <IconoMas tamano={16} />
        <span>Nueva nota{seleccionada ? ` en ${seleccionada.split("/").pop()}` : ""}</span>
      </button>
      {rutas.length === 0 ? (
        <p className={styles.vacio}>
          Aún no hay notas guardadas en este dispositivo. Usa Actualizar en el menú ⋯ para descargarlas.
        </p>
      ) : (
        <nav aria-label="Explorador de archivos">
          <Rama
            nodos={arbol}
            nivel={0}
            expandidas={expandidas}
            seleccionada={seleccionada}
            rutaActiva={rutaActiva}
            onAlternar={alternar}
            onAbrir={onAbrir}
          />
        </nav>
      )}
    </div>
  );
}
