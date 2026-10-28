"use client";

import { useEffect, useState } from "react";
import { listarNotas } from "@/lib/vault/store";

export function useRutasDeNotas(clave: string | null, version: number) {
  const [rutas, setRutas] = useState<string[] | null>(null);

  useEffect(() => {
    if (!clave) return;
    let activo = true;
    listarNotas(clave)
      .then((notas) => {
        if (activo) setRutas(notas.map((nota) => nota.ruta));
      })
      .catch(() => {
        if (activo) setRutas([]);
      });
    return () => {
      activo = false;
    };
  }, [clave, version]);

  return clave ? rutas : [];
}
