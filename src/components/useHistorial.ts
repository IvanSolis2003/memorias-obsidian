"use client";

import { useEffect, useSyncExternalStore } from "react";
import { leerHistorial, registrarNavegacion, suscribirHistorial } from "@/lib/historial";

export function useHistorial(pathname: string | null) {
  const estado = useSyncExternalStore(suscribirHistorial, leerHistorial, leerHistorial);

  useEffect(() => {
    if (pathname) registrarNavegacion(pathname);
  }, [pathname]);

  return {
    puedeAtras: estado.indice > 0,
    puedeAdelante: estado.indice < estado.pila.length - 1,
  };
}
