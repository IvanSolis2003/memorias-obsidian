"use client";

import type { ReactNode } from "react";
import {
  IconoActualizar,
  IconoBuscar,
  IconoEnlace,
  IconoGrafo,
  IconoInfo,
  IconoLuna,
  IconoMarcador,
  IconoSalir,
  IconoSol,
} from "./Icons";
import type { Tema } from "./useTema";
import styles from "./MenuMas.module.css";

type MenuMasProps = {
  tema: Tema;
  puedeActualizar: boolean;
  descripcionActualizar: string | null;
  onActualizar: () => void;
  onGrafo: () => void;
  marcadaActual: boolean | null;
  onMarcador: () => void;
  onSelector: () => void;
  onAlternarTema: () => void;
  onConexiones: () => void;
  onCuenta: () => void;
  onCerrarSesion: () => void;
  onCerrar: () => void;
};

type Opcion = {
  id: string;
  etiqueta: string;
  descripcion?: string | null;
  icono: ReactNode;
  disponible: boolean;
  onElegir?: () => void;
};

export function MenuMas({
  tema,
  puedeActualizar,
  descripcionActualizar,
  onActualizar,
  onGrafo,
  marcadaActual,
  onMarcador,
  onSelector,
  onAlternarTema,
  onConexiones,
  onCuenta,
  onCerrarSesion,
  onCerrar,
}: MenuMasProps) {
  const opciones: Opcion[] = [
    {
      id: "actualizar",
      etiqueta: "Actualizar",
      descripcion: descripcionActualizar,
      icono: <IconoActualizar tamano={20} />,
      disponible: puedeActualizar,
      onElegir: onActualizar,
    },
    {
      id: "grafo",
      etiqueta: "Grafo",
      icono: <IconoGrafo tamano={20} />,
      disponible: puedeActualizar,
      onElegir: onGrafo,
    },
    {
      id: "marcador",
      etiqueta: marcadaActual ? "Quitar marcador" : "Marcar nota",
      icono: <IconoMarcador tamano={20} />,
      disponible: marcadaActual !== null,
      onElegir: onMarcador,
    },
    {
      id: "selector",
      etiqueta: "Selector rápido",
      icono: <IconoBuscar tamano={20} />,
      disponible: puedeActualizar,
      onElegir: onSelector,
    },
    {
      id: "tema",
      etiqueta: tema === "oscuro" ? "Tema claro" : "Tema oscuro",
      icono: tema === "oscuro" ? <IconoSol tamano={20} /> : <IconoLuna tamano={20} />,
      disponible: true,
      onElegir: onAlternarTema,
    },
    {
      id: "conexiones",
      etiqueta: "Conexiones",
      icono: <IconoEnlace tamano={20} />,
      disponible: true,
      onElegir: onConexiones,
    },
    {
      id: "cuenta",
      etiqueta: "Cuenta y privacidad",
      icono: <IconoInfo tamano={20} />,
      disponible: true,
      onElegir: onCuenta,
    },
    {
      id: "salir",
      etiqueta: "Cerrar sesión",
      icono: <IconoSalir tamano={20} />,
      disponible: true,
      onElegir: onCerrarSesion,
    },
  ];

  return (
    <>
      <div className={styles.fondo} onClick={onCerrar} aria-hidden="true" />
      <div className={styles.menu} role="menu">
        {opciones.map((o) => (
          <button
            key={o.id}
            type="button"
            role="menuitem"
            className={styles.opcion}
            disabled={!o.disponible}
            onClick={() => {
              o.onElegir?.();
              onCerrar();
            }}
          >
            {o.icono}
            <span className={styles.textos}>
              <span>{o.etiqueta}</span>
              {o.descripcion && <span className={styles.descripcion}>{o.descripcion}</span>}
            </span>
          </button>
        ))}
      </div>
    </>
  );
}
