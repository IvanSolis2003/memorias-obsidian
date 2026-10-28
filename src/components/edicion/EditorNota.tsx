"use client";

import { useEffect, useMemo, useRef, useState, useSyncExternalStore, type ChangeEvent } from "react";
import { EXTENSIONES_PERMITIDAS } from "@/lib/vault/attachments";
import { filtrarSugerencias, nombresParaEnlazar, type SugerenciaEnlace } from "@/lib/vault/links";
import { subirAdjunto, type OrigenAdjunto } from "@/lib/vault/subir";
import { leerViewport, suscribirViewport, viewportDelServidor } from "@/lib/viewport";
import { useClaveVault } from "../ContextoVault";
import { useRutasDeNotas } from "../useRutasDeNotas";
import { BarraHerramientas } from "./BarraHerramientas";
import { useContextoEdicion } from "./ContextoEdicion";
import { DialogoConflicto } from "./DialogoConflicto";
import { EditorMarkdown, type ContextoEnlace, type ManoEditor } from "./EditorMarkdown";
import { AvisoAdjunto, MenuAdjuntar, type EstadoAdjunto } from "./PanelAdjuntos";
import { Sugerencias } from "./Sugerencias";
import styles from "./Edicion.module.css";

const ALTO_HERRAMIENTAS = "48px";
const ALTO_BARRA_INFERIOR = "(var(--toolbar-height) + var(--safe-bottom))";
const ALTO_CABECERA = "(var(--header-height) + var(--safe-top))";
const ACEPTAR_ARCHIVOS = EXTENSIONES_PERMITIDAS.map((extension) => `.${extension}`).join(",");

export function EditorNota() {
  const edicion = useContextoEdicion();
  const clave = useClaveVault();
  const rutas = useRutasDeNotas(clave, 0);
  const vista = useSyncExternalStore(suscribirViewport, leerViewport, viewportDelServidor);
  const editor = useRef<ManoEditor>(null);
  const [contexto, setContexto] = useState<ContextoEnlace | null>(null);
  const [menuAbierto, setMenuAbierto] = useState(false);
  const [adjunto, setAdjunto] = useState<EstadoAdjunto | null>(null);
  const entradaCamara = useRef<HTMLInputElement>(null);
  const entradaFotos = useRef<HTMLInputElement>(null);
  const entradaArchivo = useRef<HTMLInputElement>(null);
  const vistaPrevia = useRef<string | null>(null);
  const { sesion } = edicion;

  useEffect(
    () => () => {
      if (vistaPrevia.current) URL.revokeObjectURL(vistaPrevia.current);
    },
    [],
  );

  const nombres = useMemo(() => nombresParaEnlazar(rutas ?? []), [rutas]);
  const sugerencias = useMemo(
    () => (contexto ? filtrarSugerencias(nombres, contexto.consulta) : []),
    [nombres, contexto],
  );

  if (!sesion || sesion.fase === "cargando") return <p className={styles.estado}>Abriendo la nota…</p>;
  if (sesion.fase === "error") {
    return (
      <p className={styles.estado}>
        Esta nota no está guardada en este dispositivo. Usa Actualizar en el menú ⋯ para descargarla.
      </p>
    );
  }

  const altoVista = vista.alto > 0 ? `${vista.alto}px` : "100dvh";
  const reservaInferior = vista.teclado ? "0px" : ALTO_BARRA_INFERIOR;
  const topEditor = `calc(${vista.arriba}px + ${ALTO_CABECERA})`;
  const altoEditor = `calc(${altoVista} - ${ALTO_CABECERA} - ${reservaInferior} - ${ALTO_HERRAMIENTAS})`;
  const topHerramientas = `calc(${vista.arriba}px + ${altoVista} - ${reservaInferior} - ${ALTO_HERRAMIENTAS})`;

  function soltarVistaPrevia() {
    if (vistaPrevia.current) URL.revokeObjectURL(vistaPrevia.current);
    vistaPrevia.current = null;
  }

  async function adjuntar(archivo: File, origen: OrigenAdjunto) {
    if (!clave || !sesion) return;
    soltarVistaPrevia();
    setAdjunto({ fase: "subiendo", nombre: archivo.name });
    try {
      const subido = await subirAdjunto(clave, sesion.ruta, archivo, origen);
      vistaPrevia.current = subido.vistaPrevia;
      editor.current?.insertarEnLineaPropia(subido.enlace);
      setAdjunto({ fase: "listo", nombre: subido.nombre, vistaPrevia: subido.vistaPrevia });
    } catch (error) {
      setAdjunto({
        fase: "error",
        mensaje: error instanceof Error ? error.message : "No se pudo adjuntar el archivo.",
      });
    }
  }

  function elegirOrigen(origen: OrigenAdjunto) {
    setMenuAbierto(false);
    const entradas = { camara: entradaCamara, fotos: entradaFotos, archivo: entradaArchivo };
    entradas[origen].current?.click();
  }

  function alElegirArchivo(evento: ChangeEvent<HTMLInputElement>, origen: OrigenAdjunto) {
    const archivo = evento.target.files?.[0];
    evento.target.value = "";
    if (archivo) adjuntar(archivo, origen);
  }

  function cerrarAviso() {
    soltarVistaPrevia();
    setAdjunto(null);
  }

  function elegirSugerencia(sugerencia: SugerenciaEnlace) {
    if (!contexto || !editor.current) return;
    const despues = editor.current.textoDespues(contexto.hasta, 2);
    const hasta = despues === "]]" ? contexto.hasta + 2 : contexto.hasta;
    editor.current.reemplazar(contexto.desde, hasta, `${sugerencia.texto}]]`);
  }

  return (
    <>
      <div className={styles.editor} style={{ top: topEditor, height: altoEditor }}>
        {sesion.borradorRecuperado && (
          <div className={styles.aviso}>
            <span>Se recuperó un borrador sin guardar.</span>
            <button type="button" className={styles.avisoBoton} onClick={edicion.descartarBorrador}>
              Descartar
            </button>
          </div>
        )}
        {sesion.estado === "error" && sesion.mensaje && !sesion.conflicto && (
          <div className={`${styles.aviso} ${styles.error}`} role="alert">
            {sesion.mensaje}
          </div>
        )}
        <div className={styles.cuerpo}>
          <EditorMarkdown
            key={`${sesion.ruta}:${sesion.revision}`}
            ref={editor}
            valorInicial={sesion.texto}
            onCambio={edicion.cambiarTexto}
            onContextoEnlace={setContexto}
          />
        </div>
      </div>

      <div className={styles.encima} style={{ top: topHerramientas }}>
        <Sugerencias sugerencias={sugerencias} onElegir={elegirSugerencia} />
        {menuAbierto && <MenuAdjuntar onElegir={elegirOrigen} />}
        {adjunto && <AvisoAdjunto estado={adjunto} onCerrar={cerrarAviso} />}
      </div>
      <BarraHerramientas
        editor={editor}
        top={topHerramientas}
        adjuntarDeshabilitado={!edicion.enLinea || adjunto?.fase === "subiendo"}
        onAdjuntar={() => setMenuAbierto((abierto) => !abierto)}
      />
      <input
        ref={entradaCamara}
        type="file"
        accept="image/*"
        capture="environment"
        hidden
        onChange={(evento) => alElegirArchivo(evento, "camara")}
      />
      <input
        ref={entradaFotos}
        type="file"
        accept="image/*"
        hidden
        onChange={(evento) => alElegirArchivo(evento, "fotos")}
      />
      <input
        ref={entradaArchivo}
        type="file"
        accept={ACEPTAR_ARCHIVOS}
        hidden
        onChange={(evento) => alElegirArchivo(evento, "archivo")}
      />

      {sesion.conflicto && (
        <DialogoConflicto
          conflicto={sesion.conflicto}
          miTexto={sesion.texto}
          onSobrescribir={edicion.sobrescribir}
          onCerrar={edicion.cerrarConflicto}
        />
      )}
    </>
  );
}
