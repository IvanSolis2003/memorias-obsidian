"use client";

import { useEffect, useRef, useState } from "react";
import {
  abrirPestana,
  activarPestana,
  cerrarPestana,
  esEstadoValido,
  estadoInicial,
  registrarUrl,
  type EstadoPestanas,
} from "@/lib/pestanas";
import { guardarPestanas, leerPestanas } from "@/lib/vault/store";

type Cargado = { clave: string; estado: EstadoPestanas };

export function usePestanas(clave: string | null, pathname: string | null) {
  const [cargado, setCargado] = useState<Cargado | null>(null);
  const [vista, setVista] = useState<string | null>(null);
  const rutaInicial = useRef(pathname);

  useEffect(() => {
    if (!clave) return;
    let activo = true;
    leerPestanas(clave)
      .then((guardado) => {
        if (!activo) return;
        setCargado({
          clave,
          estado: esEstadoValido(guardado) ? guardado : estadoInicial(rutaInicial.current ?? "/"),
        });
        setVista(null);
      })
      .catch(() => {
        if (activo) setCargado({ clave, estado: estadoInicial(rutaInicial.current ?? "/") });
      });
    return () => {
      activo = false;
    };
  }, [clave]);

  if (cargado && cargado.clave === clave && pathname && vista !== pathname) {
    setVista(pathname);
    setCargado({ clave: cargado.clave, estado: registrarUrl(cargado.estado, pathname) });
  }

  const estado = cargado && cargado.clave === clave ? cargado.estado : null;

  useEffect(() => {
    if (clave && estado && vista === pathname) guardarPestanas(clave, estado).catch(() => null);
  }, [clave, estado, vista, pathname]);

  function cambiar(nuevo: EstadoPestanas) {
    setCargado((previo) => (previo ? { ...previo, estado: nuevo } : previo));
  }

  return {
    pestanas: estado?.pestanas ?? [],
    activa: estado?.activa ?? null,
    abrir(url: string) {
      if (estado) cambiar(abrirPestana(estado, url));
    },
    activar(id: string) {
      if (!estado) return null;
      cambiar(activarPestana(estado, id));
      return estado.pestanas.find((p) => p.id === id)?.url ?? null;
    },
    cerrar(id: string) {
      if (!estado) return null;
      const nuevo = cerrarPestana(estado, id);
      cambiar(nuevo);
      if (nuevo.activa === estado.activa) return null;
      return nuevo.pestanas.find((p) => p.id === nuevo.activa)?.url ?? null;
    },
  };
}
