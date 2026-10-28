"use client";

import { useEffect, useState } from "react";
import { resolverSalientes, type EnlaceSaliente, type EntranteNota } from "@/lib/vault/links";
import { obtenerEntrantes, obtenerResolutor } from "@/lib/vault/resolutor";
import { leerNota } from "@/lib/vault/store";
import type { NotaGuardada } from "@/lib/vault/tipos";

export type DatosNota = {
  ruta: string;
  nota: NotaGuardada | null;
  entrantes: EntranteNota[];
  salientes: EnlaceSaliente[];
};

async function cargarDatos(clave: string, ruta: string): Promise<DatosNota> {
  const [nota, resolutor, entrantes] = await Promise.all([
    leerNota(clave, ruta),
    obtenerResolutor(clave),
    obtenerEntrantes(clave, ruta),
  ]);
  return {
    ruta,
    nota: nota ?? null,
    entrantes,
    salientes: nota ? resolverSalientes(nota.enlaces, ruta, resolutor) : [],
  };
}

export function useDatosNota(clave: string | null, ruta: string | null, version: number) {
  const [datos, setDatos] = useState<DatosNota | null>(null);

  useEffect(() => {
    if (!clave || !ruta) return;
    let activo = true;
    cargarDatos(clave, ruta)
      .then((cargados) => {
        if (activo) setDatos(cargados);
      })
      .catch(() => {
        if (activo) setDatos({ ruta, nota: null, entrantes: [], salientes: [] });
      });
    return () => {
      activo = false;
    };
  }, [clave, ruta, version]);

  return clave && ruta && datos?.ruta === ruta ? datos : null;
}
