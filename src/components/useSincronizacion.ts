"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { invalidarCache } from "@/lib/vault/resolutor";
import { leerMeta, purgarOtros } from "@/lib/vault/store";
import {
  ErrorSync,
  sincronizar,
  type Progreso,
  type ResultadoSync,
} from "@/lib/vault/sync";

const SEGUNDOS_EN_SEGUNDO_PLANO = 30 * 60;
const MS_AVISO_RESULTADO = 6000;

export type EstadoSync =
  | { fase: "inactivo" }
  | { fase: "sincronizando"; progreso: Progreso }
  | { fase: "listo"; resultado: ResultadoSync }
  | { fase: "sin-conexion" }
  | { fase: "error"; mensaje: string };

type InfoLocal = {
  ultimaActualizacion: string | null;
  vacio: boolean;
};

export function useSincronizacion(clave: string | null) {
  const router = useRouter();
  const [estado, setEstado] = useState<EstadoSync>({ fase: "inactivo" });
  const [info, setInfo] = useState<InfoLocal | null>(null);
  const [dialogoAbierto, setDialogoAbierto] = useState(false);
  const [version, setVersion] = useState(0);
  const ocupado = useRef(false);
  const temporizador = useRef<ReturnType<typeof setTimeout> | null>(null);
  const ocultoDesde = useRef<number | null>(null);

  const leerInfoLocal = useCallback(async (claveVault: string) => {
    const meta = await leerMeta(claveVault);
    return { ultimaActualizacion: meta?.ultimaActualizacion ?? null, vacio: !meta };
  }, []);

  useEffect(() => {
    if (!clave) return;
    let activo = true;
    purgarOtros(clave)
      .then(() => leerInfoLocal(clave))
      .then((local) => {
        if (!activo) return;
        setInfo(local);
        setDialogoAbierto(true);
      })
      .catch(() => {
        if (activo) setInfo({ ultimaActualizacion: null, vacio: true });
      });
    return () => {
      activo = false;
    };
  }, [clave, leerInfoLocal]);

  useEffect(() => {
    if (!clave) return;
    const alCambiarVisibilidad = () => {
      if (document.visibilityState === "hidden") {
        ocultoDesde.current = Date.now();
        return;
      }
      const desde = ocultoDesde.current;
      ocultoDesde.current = null;
      if (desde === null || (Date.now() - desde) / 1000 < SEGUNDOS_EN_SEGUNDO_PLANO) return;
      leerInfoLocal(clave)
        .then((local) => {
          setInfo(local);
          setDialogoAbierto(true);
        })
        .catch(() => null);
    };
    document.addEventListener("visibilitychange", alCambiarVisibilidad);
    return () => document.removeEventListener("visibilitychange", alCambiarVisibilidad);
  }, [clave, leerInfoLocal]);

  const notificarCambioLocal = useCallback(() => {
    invalidarCache();
    setVersion((actual) => actual + 1);
  }, []);

  const descartarAviso = useCallback(() => {
    if (temporizador.current) clearTimeout(temporizador.current);
    temporizador.current = null;
    setEstado({ fase: "inactivo" });
  }, []);

  const actualizar = useCallback(async () => {
    if (!clave || ocupado.current) return;
    ocupado.current = true;
    setDialogoAbierto(false);
    if (temporizador.current) clearTimeout(temporizador.current);
    setEstado({ fase: "sincronizando", progreso: { hechas: 0, total: 0 } });
    try {
      const resultado = await sincronizar(clave, (progreso) =>
        setEstado({ fase: "sincronizando", progreso }),
      );
      setInfo(await leerInfoLocal(clave));
      setVersion((actual) => actual + 1);
      setEstado({ fase: "listo", resultado });
      if (resultado.fallidas === 0) {
        temporizador.current = setTimeout(
          () => setEstado({ fase: "inactivo" }),
          MS_AVISO_RESULTADO,
        );
      }
    } catch (error) {
      if (error instanceof ErrorSync && error.codigo === "sin-conexion") {
        setEstado({ fase: "sin-conexion" });
      } else if (error instanceof ErrorSync && error.destino) {
        router.push(error.destino);
        setEstado({ fase: "error", mensaje: error.message });
      } else {
        setEstado({
          fase: "error",
          mensaje: error instanceof Error ? error.message : "No se pudo actualizar.",
        });
      }
    } finally {
      invalidarCache();
      ocupado.current = false;
    }
  }, [clave, leerInfoLocal, router]);

  return {
    estado,
    info,
    version,
    dialogoAbierto,
    cerrarDialogo: () => setDialogoAbierto(false),
    descartarAviso,
    actualizar,
    notificarCambioLocal,
  };
}
