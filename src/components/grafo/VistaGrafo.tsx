"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  construirGrafo,
  filtrarGrafo,
  maticesPorCarpeta,
  subgrafoLocal,
  vecinosPorNodo,
  type Grafo,
} from "@/lib/vault/graph";
import { carpetasDeRutas } from "@/lib/vault/nombres";
import { obtenerResolutor } from "@/lib/vault/resolutor";
import { listarNotas } from "@/lib/vault/store";
import { leerUltimaNota } from "@/lib/vault/ultima";
import { urlDeNota } from "@/lib/vault/url";
import { useClaveVault, useVersionDatos } from "../ContextoVault";
import { GraphCanvas } from "./GraphCanvas";
import styles from "./Grafo.module.css";

type Modo = "global" | "local";

export function VistaGrafo() {
  const clave = useClaveVault();
  const version = useVersionDatos();
  const router = useRouter();
  const notaParametro = useSearchParams().get("nota");

  const [completo, setCompleto] = useState<Grafo | null>(null);
  const [modo, setModo] = useState<Modo>("global");
  const [profundidad, setProfundidad] = useState(1);
  const [texto, setTexto] = useState("");
  const [carpeta, setCarpeta] = useState("");
  const [huerfanas, setHuerfanas] = useState(true);
  const [coloreado, setColoreado] = useState(true);
  const [filtrosAbiertos, setFiltrosAbiertos] = useState(false);
  const [seleccionado, setSeleccionado] = useState<string | null>(null);
  const [enfoque, setEnfoque] = useState<{ id: string; contador: number } | null>(null);

  useEffect(() => {
    if (!clave) return;
    let activo = true;
    Promise.all([listarNotas(clave), obtenerResolutor(clave)])
      .then(([notas, resolutor]) => {
        if (!activo) return;
        setCompleto(
          construirGrafo(
            notas.map((nota) => ({ ruta: nota.ruta, titulo: nota.titulo, enlaces: nota.enlaces })),
            resolutor,
          ),
        );
      })
      .catch(() => {
        if (activo) setCompleto({ nodos: [], aristas: [] });
      });
    return () => {
      activo = false;
    };
  }, [clave, version]);

  const candidata = notaParametro ?? (clave ? leerUltimaNota(clave) : null);
  const centro =
    candidata && completo?.nodos.some((nodo) => nodo.id === candidata) ? candidata : null;
  const modoEfectivo: Modo = modo === "local" && centro ? "local" : "global";

  const grafo = useMemo(() => {
    if (!completo) return null;
    const base =
      modoEfectivo === "local" && centro ? subgrafoLocal(completo, centro, profundidad) : completo;
    return filtrarGrafo(base, { texto, carpeta, huerfanas });
  }, [completo, modoEfectivo, centro, profundidad, texto, carpeta, huerfanas]);

  const carpetas = useMemo(
    () => carpetasDeRutas((completo?.nodos ?? []).map((nodo) => nodo.id)),
    [completo],
  );
  const vecinos = useMemo(() => (grafo ? vecinosPorNodo(grafo) : new Map<string, Set<string>>()), [grafo]);
  const matices = useMemo(() => (completo ? maticesPorCarpeta(completo) : new Map<string, number>()), [completo]);
  const carpetaDeFiltro = carpeta.split("/")[0];

  const alSeleccionar = useCallback((id: string | null) => setSeleccionado(id), []);
  const alAbrir = useCallback((id: string) => router.push(urlDeNota(id)), [router]);

  const nodoSeleccionado =
    grafo && seleccionado ? (grafo.nodos.find((nodo) => nodo.id === seleccionado) ?? null) : null;
  const conectados = nodoSeleccionado
    ? [...(vecinos.get(nodoSeleccionado.id) ?? [])]
        .map((id) => grafo?.nodos.find((nodo) => nodo.id === id))
        .filter((nodo) => nodo !== undefined)
        .sort((a, b) => a.titulo.localeCompare(b.titulo, "es", { numeric: true, sensitivity: "base" }))
    : [];

  if (!clave) {
    return <p className={styles.mensaje}>Conecta un vault para ver su grafo.</p>;
  }
  if (!completo || !grafo) return <p className={styles.mensaje}>Preparando el grafo…</p>;
  if (completo.nodos.length === 0) {
    return (
      <p className={styles.mensaje}>
        Aún no hay notas guardadas en este dispositivo. Usa Actualizar en el menú ⋯ para descargarlas.
      </p>
    );
  }

  return (
    <div className={styles.vista}>
      <GraphCanvas
        grafo={grafo}
        seleccionado={nodoSeleccionado?.id ?? null}
        centro={modoEfectivo === "local" ? centro : null}
        enfoque={enfoque}
        matices={coloreado ? matices : null}
        onSeleccionar={alSeleccionar}
        onAbrir={alAbrir}
      />

      <div className={styles.controles}>
        <div className={styles.fila}>
          <div className={styles.segmentos} role="tablist">
            {(["global", "local"] as const).map((valor) => (
              <button
                key={valor}
                type="button"
                role="tab"
                aria-selected={modoEfectivo === valor}
                disabled={valor === "local" && !centro}
                className={`${styles.segmento} ${modoEfectivo === valor ? styles.segmentoActivo : ""}`}
                onClick={() => setModo(valor)}
              >
                {valor === "global" ? "Global" : "Local"}
              </button>
            ))}
          </div>
          <button
            type="button"
            className={styles.botonFiltros}
            aria-expanded={filtrosAbiertos}
            onClick={() => setFiltrosAbiertos((abierto) => !abierto)}
          >
            Filtros{texto || carpeta || !huerfanas ? " •" : ""}
          </button>
        </div>

        {filtrosAbiertos && (
          <div className={styles.filtros}>
            <input
              className={styles.campo}
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              placeholder="Filtrar por nombre o ruta"
              aria-label="Filtrar por texto"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
            />
            <select
              className={styles.campo}
              value={carpeta}
              onChange={(e) => setCarpeta(e.target.value)}
              aria-label="Filtrar por carpeta"
            >
              <option value="">Todas las carpetas</option>
              {carpetas.map((ruta) => (
                <option key={ruta} value={ruta}>
                  {ruta}
                </option>
              ))}
            </select>
            {modoEfectivo === "local" && (
              <select
                className={styles.campo}
                value={profundidad}
                onChange={(e) => setProfundidad(Number(e.target.value))}
                aria-label="Profundidad del grafo local"
              >
                <option value={1}>Profundidad 1 (vecinos directos)</option>
                <option value={2}>Profundidad 2</option>
                <option value={3}>Profundidad 3</option>
              </select>
            )}
            <label className={styles.casilla}>
              <input
                type="checkbox"
                checked={huerfanas}
                onChange={(e) => setHuerfanas(e.target.checked)}
              />
              Mostrar notas sin enlaces
            </label>
            <label className={styles.casilla}>
              <input
                type="checkbox"
                checked={coloreado}
                onChange={(e) => setColoreado(e.target.checked)}
              />
              Colorear por carpeta
            </label>
          </div>
        )}
      </div>

      {grafo.nodos.length === 0 && (
        <p className={styles.sinResultados}>Ninguna nota coincide con los filtros.</p>
      )}

      {coloreado && matices.size > 0 && (
        <div className={styles.leyenda} aria-label="Carpetas del vault">
          {[...matices].map(([nombre, matiz]) => (
            <button
              key={nombre}
              type="button"
              className={`${styles.etiquetaCarpeta} ${carpetaDeFiltro === nombre ? styles.etiquetaActiva : ""}`}
              aria-pressed={carpetaDeFiltro === nombre}
              onClick={() => setCarpeta(carpetaDeFiltro === nombre ? "" : nombre)}
            >
              <span className={styles.punto} style={{ background: `hsl(${matiz} 62% 62%)` }} />
              {nombre}
            </button>
          ))}
        </div>
      )}

      <p className={styles.conteo}>
        {grafo.nodos.length} {grafo.nodos.length === 1 ? "nota" : "notas"} · {grafo.aristas.length}{" "}
        {grafo.aristas.length === 1 ? "enlace" : "enlaces"}
      </p>

      {nodoSeleccionado && (
        <div className={styles.panel} role="region" aria-label="Nota seleccionada">
          <div className={styles.panelCabecera}>
            <div className={styles.panelTextos}>
              <strong className={styles.panelTitulo}>{nodoSeleccionado.titulo}</strong>
              {nodoSeleccionado.carpeta && (
                <span className={styles.panelCarpeta}>{nodoSeleccionado.carpeta}</span>
              )}
            </div>
            <button type="button" className={styles.cerrar} aria-label="Cerrar" onClick={() => setSeleccionado(null)}>
              ×
            </button>
          </div>
          <p className={styles.panelConteo}>
            {conectados.length === 0
              ? "Sin conexiones"
              : `${conectados.length} ${conectados.length === 1 ? "conexión" : "conexiones"}`}
          </p>
          {conectados.length > 0 && (
            <ul className={styles.conexiones}>
              {conectados.map((nodo) => (
                <li key={nodo.id}>
                  <button
                    type="button"
                    className={styles.conexion}
                    onClick={() => {
                      setSeleccionado(nodo.id);
                      setEnfoque((previo) => ({ id: nodo.id, contador: (previo?.contador ?? 0) + 1 }));
                    }}
                  >
                    {nodo.titulo}
                  </button>
                </li>
              ))}
            </ul>
          )}
          <button type="button" className={styles.abrir} onClick={() => alAbrir(nodoSeleccionado.id)}>
            Abrir nota
          </button>
        </div>
      )}
    </div>
  );
}
