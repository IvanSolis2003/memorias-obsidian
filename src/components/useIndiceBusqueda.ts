"use client";

import { useEffect, useState } from "react";
import { obtenerIndice, type Indice } from "@/lib/vault/busqueda";

type Estado = { llave: string; indice: Indice | null };

export function useIndiceBusqueda(clave: string | null, version: number, activo: boolean) {
  const [estado, setEstado] = useState<Estado | null>(null);
  const llave = `${clave}|${version}`;

  useEffect(() => {
    if (!clave || !activo) return;
    let vigente = true;
    obtenerIndice(clave, version)
      .then((indice) => {
        if (vigente) setEstado({ llave, indice });
      })
      .catch(() => {
        if (vigente) setEstado({ llave, indice: null });
      });
    return () => {
      vigente = false;
    };
  }, [clave, version, activo, llave]);

  const listo = estado?.llave === llave;
  return { indice: listo ? estado.indice : null, cargando: Boolean(clave) && activo && !listo };
}
