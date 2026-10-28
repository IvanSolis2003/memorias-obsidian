"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { eliminarBorrador, guardarBorrador, leerBorrador } from "@/lib/vault/drafts";
import {
  aplicarGuardado,
  ErrorGuardado,
  guardarNota,
  leerVersionRemota,
  type VersionRemota,
} from "@/lib/vault/guardar";
import { leerContenido, leerNota } from "@/lib/vault/store";

export type EstadoGuardado = "limpio" | "modificado" | "guardando" | "guardado" | "error";

export type Conflicto = {
  remota: VersionRemota | null;
  cargando: boolean;
};

export type SesionEdicion = {
  ruta: string;
  fase: "cargando" | "lista" | "error";
  base: { sha: string; contenido: string };
  texto: string;
  estado: EstadoGuardado;
  mensaje: string | null;
  borradorRecuperado: boolean;
  revision: number;
  conflicto: Conflicto | null;
};

const MS_BORRADOR = 500;
const MENSAJE_SALIDA = "Tienes cambios sin guardar. Se conservarán como borrador en este dispositivo.";

function sesionVacia(ruta: string, fase: SesionEdicion["fase"]): SesionEdicion {
  return {
    ruta,
    fase,
    base: { sha: "", contenido: "" },
    texto: "",
    estado: "limpio",
    mensaje: null,
    borradorRecuperado: false,
    revision: 0,
    conflicto: null,
  };
}

export function useEdicion(
  clave: string | null,
  rutaActiva: string | null,
  enLinea: boolean,
  alGuardar: () => void,
) {
  const [rutaEnEdicion, setRutaEnEdicion] = useState<string | null>(null);
  const [sesion, setSesion] = useState<SesionEdicion | null>(null);
  const referencia = useRef<SesionEdicion | null>(null);
  const pendiente = useRef<(() => void) | null>(null);

  const modo = rutaActiva !== null && rutaEnEdicion === rutaActiva ? "edicion" : "lectura";
  const actual = sesion && modo === "edicion" && sesion.ruta === rutaActiva ? sesion : null;
  const sinGuardar = actual?.fase === "lista" && actual.texto !== actual.base.contenido;

  useEffect(() => {
    referencia.current = actual;
  }, [actual]);

  useEffect(() => {
    if (!clave || !rutaActiva || modo !== "edicion") return;
    let activo = true;
    Promise.all([
      leerNota(clave, rutaActiva),
      leerContenido(clave, rutaActiva),
      leerBorrador(clave, rutaActiva),
    ])
      .then(([nota, contenido, borrador]) => {
        if (!activo) return;
        if (!nota || contenido === undefined) {
          setSesion(sesionVacia(rutaActiva, "error"));
          return;
        }
        const recuperado = borrador !== undefined && borrador.texto !== contenido;
        setSesion({
          ...sesionVacia(rutaActiva, "lista"),
          base: { sha: nota.sha, contenido },
          texto: recuperado ? borrador.texto : contenido,
          estado: recuperado ? "modificado" : "limpio",
          borradorRecuperado: recuperado,
        });
      })
      .catch(() => {
        if (activo) setSesion(sesionVacia(rutaActiva, "error"));
      });
    return () => {
      activo = false;
    };
  }, [clave, rutaActiva, modo]);

  const textoActual = actual?.fase === "lista" ? actual.texto : null;
  const contenidoBase = actual?.fase === "lista" ? actual.base.contenido : null;
  const shaBase = actual?.fase === "lista" ? actual.base.sha : null;

  useEffect(() => {
    if (!clave || !rutaActiva || textoActual === null || contenidoBase === null) return;
    const escribir = () => {
      pendiente.current = null;
      if (textoActual === contenidoBase) {
        eliminarBorrador(clave, rutaActiva).catch(() => null);
      } else {
        guardarBorrador(clave, rutaActiva, textoActual, shaBase).catch(() => null);
      }
    };
    pendiente.current = escribir;
    const temporizador = setTimeout(escribir, MS_BORRADOR);
    return () => clearTimeout(temporizador);
  }, [clave, rutaActiva, textoActual, contenidoBase, shaBase]);

  const vaciarBorrador = useCallback(() => {
    pendiente.current?.();
  }, []);

  const actualizar = useCallback((ruta: string, cambios: Partial<SesionEdicion>) => {
    setSesion((previa) => (previa && previa.ruta === ruta ? { ...previa, ...cambios } : previa));
  }, []);

  const cambiarTexto = useCallback((texto: string) => {
    setSesion((previa) =>
      previa && previa.fase === "lista"
        ? {
            ...previa,
            texto,
            estado: texto === previa.base.contenido ? "limpio" : "modificado",
            mensaje: null,
          }
        : previa,
    );
  }, []);

  const confirmarSalida = useCallback(() => {
    if (!referencia.current || referencia.current.texto === referencia.current.base.contenido) {
      return true;
    }
    if (!window.confirm(MENSAJE_SALIDA)) return false;
    vaciarBorrador();
    return true;
  }, [vaciarBorrador]);

  const alternarModo = useCallback(() => {
    if (!rutaActiva) return;
    if (modo === "edicion" && !confirmarSalida()) return;
    vaciarBorrador();
    setRutaEnEdicion(modo === "edicion" ? null : rutaActiva);
  }, [rutaActiva, modo, confirmarSalida, vaciarBorrador]);

  const editarRuta = useCallback(
    (ruta: string) => {
      vaciarBorrador();
      setRutaEnEdicion(ruta);
    },
    [vaciarBorrador],
  );

  const guardar = useCallback(
    async (forzar?: { sha: string | null }) => {
      const previa = referencia.current;
      if (!clave || !previa || previa.fase !== "lista" || previa.estado === "guardando") return;
      const { ruta, texto } = previa;
      actualizar(ruta, { estado: "guardando", mensaje: null });
      try {
        const sha = await guardarNota(ruta, texto, forzar ? forzar.sha : previa.base.sha);
        await aplicarGuardado(clave, ruta, texto, sha);
        await eliminarBorrador(clave, ruta);
        setSesion((s) =>
          s && s.ruta === ruta
            ? {
                ...s,
                base: { sha, contenido: texto },
                estado: s.texto === texto ? "guardado" : "modificado",
                mensaje: null,
                borradorRecuperado: false,
                conflicto: null,
              }
            : s,
        );
        alGuardar();
      } catch (error) {
        const mensaje = error instanceof Error ? error.message : "No se pudo guardar la nota.";
        if (error instanceof ErrorGuardado && error.codigo === "conflicto") {
          actualizar(ruta, { estado: "error", mensaje, conflicto: { remota: null, cargando: true } });
          const remota = await leerVersionRemota(ruta).catch(() => null);
          actualizar(ruta, { conflicto: { remota, cargando: false } });
        } else {
          actualizar(ruta, { estado: "error", mensaje });
        }
      }
    },
    [clave, actualizar, alGuardar],
  );

  const sobrescribir = useCallback(() => {
    const remota = referencia.current?.conflicto?.remota ?? null;
    return guardar({ sha: remota ? remota.sha : null });
  }, [guardar]);

  const descartarBorrador = useCallback(() => {
    const previa = referencia.current;
    if (!clave || !previa || previa.fase !== "lista") return;
    eliminarBorrador(clave, previa.ruta).catch(() => null);
    actualizar(previa.ruta, {
      texto: previa.base.contenido,
      estado: "limpio",
      borradorRecuperado: false,
      revision: previa.revision + 1,
    });
  }, [clave, actualizar]);

  const cerrarConflicto = useCallback(() => {
    const previa = referencia.current;
    if (previa) actualizar(previa.ruta, { conflicto: null });
  }, [actualizar]);

  useEffect(() => {
    if (!sinGuardar) return;
    const avisar = (evento: BeforeUnloadEvent) => {
      evento.preventDefault();
      evento.returnValue = "";
    };
    const interceptar = (evento: MouseEvent) => {
      const ancla = (evento.target as Element | null)?.closest?.("a[href]") as HTMLAnchorElement | null;
      if (!ancla || ancla.target === "_blank" || ancla.hasAttribute("download")) return;
      const destino = new URL(ancla.href, window.location.href);
      if (destino.origin !== window.location.origin) return;
      if (destino.pathname === window.location.pathname) return;
      if (!confirmarSalida()) {
        evento.preventDefault();
        evento.stopPropagation();
      }
    };
    window.addEventListener("beforeunload", avisar);
    document.addEventListener("click", interceptar, true);
    return () => {
      window.removeEventListener("beforeunload", avisar);
      document.removeEventListener("click", interceptar, true);
    };
  }, [sinGuardar, confirmarSalida]);

  return {
    modo,
    sesion: actual,
    sinGuardar,
    enLinea,
    alternarModo,
    editarRuta,
    cambiarTexto,
    guardar,
    sobrescribir,
    descartarBorrador,
    cerrarConflicto,
    confirmarSalida,
  };
}

export type Edicion = ReturnType<typeof useEdicion>;
