"use client";

import { useRef, useState, type ReactNode, type TouchEvent } from "react";
import { detectarDeslizamiento, puntoDeToque, type Punto } from "./gestos";
import styles from "./Drawer.module.css";

export type PestanaDrawer = {
  id: string;
  etiqueta: string;
  icono: ReactNode;
  contenido: ReactNode;
};

type DrawerProps = {
  lado: "izquierdo" | "derecho";
  abierto: boolean;
  onCerrar: () => void;
  pestanas: PestanaDrawer[];
};

export function Drawer({ lado, abierto, onCerrar, pestanas }: DrawerProps) {
  const [activa, setActiva] = useState(pestanas[0].id);
  const inicio = useRef<Punto | null>(null);
  const pestanaActiva = pestanas.find((p) => p.id === activa) ?? pestanas[0];
  const direccionCierre = lado === "izquierdo" ? "izquierda" : "derecha";

  function alTocar(e: TouchEvent) {
    inicio.current = puntoDeToque(e.touches[0]);
  }

  function alSoltar(e: TouchEvent) {
    if (!inicio.current) return;
    const direccion = detectarDeslizamiento(inicio.current, puntoDeToque(e.changedTouches[0]));
    inicio.current = null;
    if (direccion === direccionCierre) onCerrar();
  }

  return (
    <>
      <div
        className={`${styles.velo} ${abierto ? styles.veloAbierto : ""}`}
        onClick={onCerrar}
        aria-hidden="true"
      />
      <aside
        className={`${styles.drawer} ${lado === "izquierdo" ? styles.izquierdo : styles.derecho} ${
          abierto ? styles.abierto : ""
        }`}
        inert={!abierto}
        onTouchStart={alTocar}
        onTouchEnd={alSoltar}
        aria-label={lado === "izquierdo" ? "Panel izquierdo" : "Panel derecho"}
      >
        <div className={styles.pestanas} role="tablist">
          {pestanas.map((p) => (
            <button
              key={p.id}
              type="button"
              role="tab"
              aria-selected={p.id === pestanaActiva.id}
              aria-label={p.etiqueta}
              title={p.etiqueta}
              className={`${styles.pestana} ${p.id === pestanaActiva.id ? styles.pestanaActiva : ""}`}
              onClick={() => setActiva(p.id)}
            >
              {p.icono}
            </button>
          ))}
        </div>
        <div className={styles.encabezado}>{pestanaActiva.etiqueta}</div>
        <div className={styles.contenido} role="tabpanel">
          {pestanaActiva.contenido}
        </div>
      </aside>
    </>
  );
}
