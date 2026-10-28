"use client";

import {
  forceCollide,
  forceLink,
  forceManyBody,
  forceSimulation,
  forceX,
  forceY,
  type Simulation,
  type SimulationLinkDatum,
  type SimulationNodeDatum,
} from "d3-force";
import { useCallback, useEffect, useMemo, useRef } from "react";
import { carpetaRaiz, vecinosPorNodo, type Grafo, type NodoGrafo } from "@/lib/vault/graph";
import styles from "./Grafo.module.css";

type NodoSim = SimulationNodeDatum & NodoGrafo;
type EnlaceSim = SimulationLinkDatum<NodoSim>;
type Punto = { x: number; y: number };
type Transformacion = { k: number; x: number; y: number };
type Rectangulo = { x0: number; y0: number; x1: number; y1: number };

type GraphCanvasProps = {
  grafo: Grafo;
  seleccionado: string | null;
  centro: string | null;
  enfoque: { id: string; contador: number } | null;
  matices: Map<string, number> | null;
  onSeleccionar: (id: string | null) => void;
  onAbrir: (id: string) => void;
};

const ZOOM_MINIMO = 0.15;
const ZOOM_MAXIMO = 6;
const UMBRAL_MOVIMIENTO = 6;
const MS_DOBLE_TOQUE = 320;
const MARGEN_LATERAL = 24;
const MARGEN_SUPERIOR = 68;
const MARGEN_INFERIOR = 44;
const MAX_ETIQUETAS = 160;
const CANDIDATAS_ETIQUETA = 420;
const LARGO_ETIQUETA = 26;
const ALTO_ETIQUETA = 15;

function limitar(valor: number, minimo: number, maximo: number) {
  return Math.min(Math.max(valor, minimo), maximo);
}

function radioBase(nodo: NodoGrafo) {
  return 3 + Math.sqrt(nodo.grado) * 1.3;
}

function radioPantalla(nodo: NodoGrafo, k: number) {
  const escala = limitar(Math.pow(k, 0.35), 0.7, 1.7);
  return Math.min(radioBase(nodo) * escala, 16);
}

function recortar(texto: string) {
  return texto.length > LARGO_ETIQUETA ? `${texto.slice(0, LARGO_ETIQUETA - 1)}…` : texto;
}

function ajustesDeSimulacion(cantidad: number) {
  return {
    carga: cantidad < 150 ? -170 : cantidad < 400 ? -100 : cantidad < 800 ? -50 : -24,
    distancia: cantidad < 400 ? 60 : cantidad < 800 ? 38 : 28,
    alcance: cantidad < 400 ? 600 : 260,
    colisiones: cantidad < 500,
  };
}

export function GraphCanvas({
  grafo,
  seleccionado,
  centro,
  enfoque,
  matices,
  onSeleccionar,
  onAbrir,
}: GraphCanvasProps) {
  const contenedor = useRef<HTMLDivElement>(null);
  const lienzo = useRef<HTMLCanvasElement>(null);
  const simulacion = useRef<Simulation<NodoSim> | null>(null);
  const nodosSim = useRef<NodoSim[]>([]);
  const ordenados = useRef<NodoSim[]>([]);
  const aristasSim = useRef<[NodoSim, NodoSim][]>([]);
  const transformacion = useRef<Transformacion>({ k: 1, x: 0, y: 0 });
  const tamano = useRef({ ancho: 0, alto: 0 });
  const posiciones = useRef(new Map<string, Punto>());
  const anchosTexto = useRef(new Map<string, number>());
  const interactuado = useRef(false);
  const pendiente = useRef(false);
  const vecinos = useMemo(() => vecinosPorNodo(grafo), [grafo]);
  const datos = useRef({ seleccionado, centro, matices, vecinos });
  const llamadas = useRef({ onSeleccionar, onAbrir });
  const dibujarRef = useRef<() => void>(() => {});

  const programar = useCallback(() => {
    if (pendiente.current) return;
    pendiente.current = true;
    requestAnimationFrame(() => {
      pendiente.current = false;
      dibujarRef.current();
    });
  }, []);

  useEffect(() => {
    datos.current = { seleccionado, centro, matices, vecinos };
    llamadas.current = { onSeleccionar, onAbrir };
    programar();
  }, [seleccionado, centro, matices, vecinos, onSeleccionar, onAbrir, programar]);

  useEffect(() => {
    dibujarRef.current = () => {
      const canvas = lienzo.current;
      const contexto = canvas?.getContext("2d");
      const { ancho, alto } = tamano.current;
      if (!canvas || !contexto || ancho === 0) return;

      const raiz = document.documentElement;
      const estilo = getComputedStyle(raiz);
      const color = (nombre: string) => estilo.getPropertyValue(nombre).trim();
      const colorNodo = color("--graph-node");
      const colorLinea = color("--graph-line");
      const colorFoco = color("--graph-node-focused");
      const colorTexto = color("--text-normal");
      const colorFondo = color("--background-primary");
      const fuente = getComputedStyle(document.body).fontFamily;
      const luminosidad = raiz.dataset.theme === "light" ? 42 : 64;
      const colorDeNodo = (nodo: NodoSim) => {
        const hue = datos.current.matices?.get(carpetaRaiz(nodo.carpeta));
        return hue === undefined ? colorNodo : `hsl(${hue} 62% ${luminosidad}%)`;
      };

      const dpr = window.devicePixelRatio || 1;
      contexto.setTransform(dpr, 0, 0, dpr, 0, 0);
      contexto.clearRect(0, 0, ancho, alto);

      const { k, x, y } = transformacion.current;
      const { seleccionado: activo, centro: nodoCentro, vecinos: mapa } = datos.current;
      const cercanos = activo ? (mapa.get(activo) ?? new Set<string>()) : null;
      const resaltado = (id: string) => !activo || id === activo || cercanos?.has(id) === true;
      const esFoco = (nodo: NodoSim) => nodo.id === activo || nodo.id === nodoCentro;

      contexto.translate(x, y);
      contexto.scale(k, k);

      contexto.lineWidth = 1 / k;
      contexto.strokeStyle = colorLinea;
      contexto.globalAlpha = activo ? 0.22 : 0.9;
      contexto.beginPath();
      for (const [a, b] of aristasSim.current) {
        if (activo && (a.id === activo || b.id === activo)) continue;
        contexto.moveTo(a.x ?? 0, a.y ?? 0);
        contexto.lineTo(b.x ?? 0, b.y ?? 0);
      }
      contexto.stroke();

      if (activo) {
        contexto.globalAlpha = 1;
        contexto.lineWidth = 1.8 / k;
        contexto.strokeStyle = colorFoco;
        contexto.beginPath();
        for (const [a, b] of aristasSim.current) {
          if (a.id !== activo && b.id !== activo) continue;
          contexto.moveTo(a.x ?? 0, a.y ?? 0);
          contexto.lineTo(b.x ?? 0, b.y ?? 0);
        }
        contexto.stroke();
      }

      const grupos = new Map<string, NodoSim[]>();
      for (const nodo of nodosSim.current) {
        if (esFoco(nodo)) continue;
        const llave = `${colorDeNodo(nodo)}|${resaltado(nodo.id) ? 1 : 0.28}`;
        const lista = grupos.get(llave);
        if (lista) lista.push(nodo);
        else grupos.set(llave, [nodo]);
      }
      contexto.strokeStyle = colorFondo;
      contexto.lineWidth = 1.4 / k;
      const dibujarNodos = (lista: NodoSim[], relleno: string, alfa: number, extra: number) => {
        contexto.globalAlpha = alfa;
        contexto.fillStyle = relleno;
        contexto.beginPath();
        for (const nodo of lista) {
          const nx = nodo.x ?? 0;
          const ny = nodo.y ?? 0;
          const radio = (radioPantalla(nodo, k) + extra) / k;
          contexto.moveTo(nx + radio, ny);
          contexto.arc(nx, ny, radio, 0, Math.PI * 2);
        }
        contexto.fill();
        contexto.stroke();
      };
      for (const [llave, lista] of grupos) {
        const [relleno, alfa] = llave.split("|");
        dibujarNodos(lista, relleno, Number(alfa), 0);
      }
      dibujarNodos(nodosSim.current.filter(esFoco), colorFoco, 1, 2);

      contexto.setTransform(dpr, 0, 0, dpr, 0, 0);
      contexto.globalAlpha = 1;
      contexto.textAlign = "center";
      contexto.textBaseline = "top";
      contexto.lineJoin = "round";
      contexto.lineWidth = 3.2;
      contexto.strokeStyle = colorFondo;

      const importantes: NodoSim[] = [];
      if (activo) {
        const nodoActivo = nodosSim.current.find((nodo) => nodo.id === activo);
        if (nodoActivo) importantes.push(nodoActivo);
        for (const nodo of nodosSim.current) if (cercanos?.has(nodo.id)) importantes.push(nodo);
      } else {
        const principal = nodoCentro
          ? nodosSim.current.find((nodo) => nodo.id === nodoCentro)
          : undefined;
        if (principal) importantes.push(principal);
      }
      const candidatas = [
        ...importantes,
        ...ordenados.current.slice(0, CANDIDATAS_ETIQUETA).filter((nodo) => {
          if (importantes.includes(nodo)) return false;
          return !activo || resaltado(nodo.id);
        }),
      ];

      const colocadas: Rectangulo[] = [];
      let dibujadas = 0;
      for (const nodo of candidatas) {
        if (dibujadas >= MAX_ETIQUETAS) break;
        const px = (nodo.x ?? 0) * k + x;
        const py = (nodo.y ?? 0) * k + y;
        if (px < -40 || px > ancho + 40 || py < -20 || py > alto + 20) continue;

        const destacado = importantes.includes(nodo);
        const titulo = destacado && nodo.id === activo ? nodo.titulo : recortar(nodo.titulo);
        contexto.font = `${destacado ? 600 : 400} 12px ${fuente}`;
        const llaveAncho = `${destacado ? 1 : 0}|${titulo}`;
        let anchoTexto = anchosTexto.current.get(llaveAncho);
        if (anchoTexto === undefined) {
          anchoTexto = contexto.measureText(titulo).width;
          anchosTexto.current.set(llaveAncho, anchoTexto);
        }
        const radio = radioPantalla(nodo, k) + (esFoco(nodo) ? 2 : 0);
        const caja: Rectangulo = {
          x0: px - anchoTexto / 2 - 3,
          y0: py + radio + 1,
          x1: px + anchoTexto / 2 + 3,
          y1: py + radio + 1 + ALTO_ETIQUETA,
        };
        const solapa = colocadas.some(
          (otra) => caja.x0 < otra.x1 && caja.x1 > otra.x0 && caja.y0 < otra.y1 && caja.y1 > otra.y0,
        );
        if (solapa && nodo !== importantes[0]) continue;
        colocadas.push(caja);
        dibujadas++;
        contexto.strokeText(titulo, px, py + radio + 2);
        contexto.fillStyle = colorTexto;
        contexto.fillText(titulo, px, py + radio + 2);
      }
    };
    programar();
  }, [programar]);

  const ajustar = useCallback((idCentro: string | null) => {
    const { ancho, alto } = tamano.current;
    const nodos = nodosSim.current;
    if (ancho === 0 || nodos.length === 0) return;
    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;
    for (const nodo of nodos) {
      minX = Math.min(minX, nodo.x ?? 0);
      maxX = Math.max(maxX, nodo.x ?? 0);
      minY = Math.min(minY, nodo.y ?? 0);
      maxY = Math.max(maxY, nodo.y ?? 0);
    }
    const disponibleAlto = alto - MARGEN_SUPERIOR - MARGEN_INFERIOR;
    const k = limitar(
      Math.min(
        (ancho - MARGEN_LATERAL * 2) / Math.max(maxX - minX, 1),
        disponibleAlto / Math.max(maxY - minY, 1),
      ),
      ZOOM_MINIMO,
      2.2,
    );
    const referencia = idCentro ? nodos.find((nodo) => nodo.id === idCentro) : undefined;
    const cx = referencia ? (referencia.x ?? 0) : (minX + maxX) / 2;
    const cy = referencia ? (referencia.y ?? 0) : (minY + maxY) / 2;
    transformacion.current = {
      k,
      x: ancho / 2 - cx * k,
      y: MARGEN_SUPERIOR + disponibleAlto / 2 - cy * k,
    };
  }, []);

  useEffect(() => {
    const enLocal = datos.current.centro !== null;
    const previas = enLocal ? new Map<string, Punto>() : posiciones.current;
    const nodos: NodoSim[] = grafo.nodos.map((nodo, indice) => {
      const anterior = previas.get(nodo.id);
      const angulo = indice * 2.399963;
      const distancia = 8 * Math.sqrt(indice + 1);
      return {
        ...nodo,
        x: anterior?.x ?? Math.cos(angulo) * distancia,
        y: anterior?.y ?? Math.sin(angulo) * distancia,
      };
    });
    const nodoCentro = nodos.find((nodo) => nodo.id === datos.current.centro);
    if (nodoCentro) {
      nodoCentro.x = 0;
      nodoCentro.y = 0;
      nodoCentro.fx = 0;
      nodoCentro.fy = 0;
    }
    const conPosicion = nodos.filter((nodo) => previas.has(nodo.id)).length;
    const indice = new Map(nodos.map((nodo) => [nodo.id, nodo]));
    const enlaces: EnlaceSim[] = grafo.aristas.map((arista) => ({
      source: arista.origen,
      target: arista.destino,
    }));
    const ajustes = ajustesDeSimulacion(nodos.length);

    const simulador = forceSimulation<NodoSim>(nodos)
      .force(
        "enlace",
        forceLink<NodoSim, EnlaceSim>(enlaces)
          .id((nodo) => nodo.id)
          .distance(ajustes.distancia)
          .strength(0.5),
      )
      .force(
        "carga",
        forceManyBody().strength(ajustes.carga).theta(0.95).distanceMax(ajustes.alcance),
      )
      .force("x", forceX(0).strength(0.04))
      .force("y", forceY(0).strength(0.04))
      .alphaDecay(nodos.length > 700 ? 0.06 : 0.035)
      .velocityDecay(0.35);
    if (ajustes.colisiones) {
      simulador.force(
        "colision",
        forceCollide<NodoSim>((nodo) => radioBase(nodo) + 4)
          .strength(0.9)
          .iterations(2),
      );
    }
    simulador.stop();

    const reutiliza = nodos.length > 0 && conPosicion / nodos.length > 0.7;
    const maximo = reutiliza ? 40 : 600;
    const inicio = performance.now();
    let pasos = 0;
    while (pasos < maximo && simulador.alpha() > 0.012 && performance.now() - inicio < 450) {
      simulador.tick();
      pasos++;
    }

    nodosSim.current = nodos;
    ordenados.current = [...nodos].sort((a, b) => b.grado - a.grado);
    aristasSim.current = grafo.aristas.flatMap((arista) => {
      const a = indice.get(arista.origen);
      const b = indice.get(arista.destino);
      return a && b ? [[a, b] as [NodoSim, NodoSim]] : [];
    });
    simulacion.current = simulador;
    if (!reutiliza || enLocal) {
      interactuado.current = false;
      ajustar(datos.current.centro);
    }
    simulador.on("tick", programar);
    simulador.on("end", () => {
      if (!interactuado.current) ajustar(datos.current.centro);
      programar();
    });
    if (simulador.alpha() > 0.012) simulador.restart();
    programar();

    return () => {
      simulador.stop();
      simulador.on("tick", null);
      simulador.on("end", null);
      if (!enLocal) {
        for (const nodo of nodos) previas.set(nodo.id, { x: nodo.x ?? 0, y: nodo.y ?? 0 });
      }
      nodosSim.current = [];
      ordenados.current = [];
      aristasSim.current = [];
      simulacion.current = null;
    };
  }, [grafo, ajustar, programar]);

  useEffect(() => {
    if (!enfoque) return;
    const nodo = nodosSim.current.find((candidato) => candidato.id === enfoque.id);
    if (!nodo) return;
    interactuado.current = true;
    const { k } = transformacion.current;
    const { ancho, alto } = tamano.current;
    transformacion.current = {
      k,
      x: ancho / 2 - (nodo.x ?? 0) * k,
      y: alto / 2 - (nodo.y ?? 0) * k,
    };
    programar();
  }, [enfoque, programar]);

  useEffect(() => {
    const caja = contenedor.current;
    const canvas = lienzo.current;
    if (!caja || !canvas) return;

    const medir = () => {
      const { width, height } = caja.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      const primera = tamano.current.ancho === 0;
      tamano.current = { ancho: width, alto: height };
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      if (primera) ajustar(datos.current.centro);
      programar();
    };
    medir();
    const observador = new ResizeObserver(medir);
    observador.observe(caja);
    return () => observador.disconnect();
  }, [ajustar, programar]);

  useEffect(() => {
    const canvas = lienzo.current;
    if (!canvas) return;

    const punteros = new Map<number, Punto>();
    let modo: "ninguno" | "mover" | "nodo" | "pellizco" = "ninguno";
    let nodoActivo: NodoSim | null = null;
    let inicio: Punto = { x: 0, y: 0 };
    let movido = false;
    let pellizco = { distancia: 0, transformacion: transformacion.current, medio: { x: 0, y: 0 } };
    let ultimoToque: { id: string; tiempo: number } | null = null;

    const relativo = (evento: PointerEvent): Punto => {
      const caja = canvas.getBoundingClientRect();
      return { x: evento.clientX - caja.left, y: evento.clientY - caja.top };
    };
    const aMundo = (punto: Punto): Punto => {
      const { k, x, y } = transformacion.current;
      return { x: (punto.x - x) / k, y: (punto.y - y) / k };
    };
    const nodoEn = (punto: Punto) => {
      const mundo = aMundo(punto);
      const { k } = transformacion.current;
      return simulacion.current?.find(mundo.x, mundo.y, 20 / k) ?? null;
    };
    const distancia = (a: Punto, b: Punto) => Math.hypot(a.x - b.x, a.y - b.y);
    const puntoMedio = (a: Punto, b: Punto): Punto => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });

    const soltarNodo = () => {
      if (nodoActivo) {
        const fijo = nodoActivo.id === datos.current.centro;
        nodoActivo.fx = fijo ? (nodoActivo.x ?? 0) : null;
        nodoActivo.fy = fijo ? (nodoActivo.y ?? 0) : null;
        simulacion.current?.alphaTarget(0);
      }
      nodoActivo = null;
    };

    const alBajar = (evento: PointerEvent) => {
      canvas.setPointerCapture(evento.pointerId);
      interactuado.current = true;
      const punto = relativo(evento);
      punteros.set(evento.pointerId, punto);
      if (punteros.size === 2) {
        soltarNodo();
        const [a, b] = [...punteros.values()];
        pellizco = {
          distancia: distancia(a, b),
          transformacion: { ...transformacion.current },
          medio: puntoMedio(a, b),
        };
        modo = "pellizco";
        return;
      }
      inicio = punto;
      movido = false;
      nodoActivo = nodoEn(punto);
      modo = nodoActivo ? "nodo" : "mover";
    };

    const alMover = (evento: PointerEvent) => {
      if (!punteros.has(evento.pointerId)) return;
      const anterior = punteros.get(evento.pointerId) as Punto;
      const punto = relativo(evento);
      punteros.set(evento.pointerId, punto);

      if (modo === "pellizco" && punteros.size >= 2) {
        const [a, b] = [...punteros.values()];
        const actual = distancia(a, b);
        const medio = puntoMedio(a, b);
        const base = pellizco.transformacion;
        const k = limitar(base.k * (actual / Math.max(pellizco.distancia, 1)), ZOOM_MINIMO, ZOOM_MAXIMO);
        const mundoX = (pellizco.medio.x - base.x) / base.k;
        const mundoY = (pellizco.medio.y - base.y) / base.k;
        transformacion.current = { k, x: medio.x - mundoX * k, y: medio.y - mundoY * k };
        programar();
        return;
      }

      if (!movido && distancia(inicio, punto) > UMBRAL_MOVIMIENTO) movido = true;
      if (!movido) return;

      if (modo === "nodo" && nodoActivo) {
        const mundo = aMundo(punto);
        nodoActivo.fx = mundo.x;
        nodoActivo.fy = mundo.y;
        simulacion.current?.alphaTarget(0.25).restart();
      } else if (modo === "mover") {
        const { k, x, y } = transformacion.current;
        transformacion.current = { k, x: x + (punto.x - anterior.x), y: y + (punto.y - anterior.y) };
        programar();
      }
    };

    const alSoltar = (evento: PointerEvent) => {
      if (!punteros.has(evento.pointerId)) return;
      punteros.delete(evento.pointerId);

      if (modo === "pellizco") {
        if (punteros.size === 1) {
          inicio = [...punteros.values()][0];
          movido = true;
          modo = "mover";
        } else {
          modo = "ninguno";
        }
        return;
      }

      const eraToque = !movido;
      const tocado = nodoActivo;
      if (modo === "nodo") soltarNodo();
      modo = "ninguno";
      if (!eraToque) return;

      if (!tocado) {
        llamadas.current.onSeleccionar(null);
        ultimoToque = null;
        return;
      }
      const ahora = performance.now();
      if (ultimoToque && ultimoToque.id === tocado.id && ahora - ultimoToque.tiempo < MS_DOBLE_TOQUE) {
        ultimoToque = null;
        llamadas.current.onAbrir(tocado.id);
        return;
      }
      ultimoToque = { id: tocado.id, tiempo: ahora };
      llamadas.current.onSeleccionar(tocado.id);
    };

    const alCancelar = (evento: PointerEvent) => {
      punteros.delete(evento.pointerId);
      soltarNodo();
      modo = "ninguno";
    };

    const alRueda = (evento: WheelEvent) => {
      evento.preventDefault();
      interactuado.current = true;
      const caja = canvas.getBoundingClientRect();
      const punto = { x: evento.clientX - caja.left, y: evento.clientY - caja.top };
      const { k, x, y } = transformacion.current;
      const nuevo = limitar(k * Math.exp(-evento.deltaY * 0.0015), ZOOM_MINIMO, ZOOM_MAXIMO);
      const mundoX = (punto.x - x) / k;
      const mundoY = (punto.y - y) / k;
      transformacion.current = { k: nuevo, x: punto.x - mundoX * nuevo, y: punto.y - mundoY * nuevo };
      programar();
    };

    canvas.addEventListener("pointerdown", alBajar);
    canvas.addEventListener("pointermove", alMover);
    canvas.addEventListener("pointerup", alSoltar);
    canvas.addEventListener("pointercancel", alCancelar);
    canvas.addEventListener("wheel", alRueda, { passive: false });
    return () => {
      canvas.removeEventListener("pointerdown", alBajar);
      canvas.removeEventListener("pointermove", alMover);
      canvas.removeEventListener("pointerup", alSoltar);
      canvas.removeEventListener("pointercancel", alCancelar);
      canvas.removeEventListener("wheel", alRueda);
    };
  }, [programar]);

  return (
    <div ref={contenedor} className={styles.lienzoContenedor}>
      <canvas
        ref={lienzo}
        className={styles.lienzo}
        role="img"
        aria-label="Grafo de notas del vault"
      />
    </div>
  );
}
