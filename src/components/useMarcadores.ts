"use client";

import { useSyncExternalStore } from "react";
import {
  alternarMarcador,
  leerMarcadores,
  marcadoresVacios,
  suscribirMarcadores,
} from "@/lib/vault/marcadores";

export function useMarcadores(clave: string | null) {
  const marcadores = useSyncExternalStore(
    suscribirMarcadores,
    () => (clave ? leerMarcadores(clave) : marcadoresVacios()),
    marcadoresVacios,
  );

  return {
    marcadores,
    alternar(ruta: string) {
      if (clave) alternarMarcador(clave, ruta);
    },
  };
}
