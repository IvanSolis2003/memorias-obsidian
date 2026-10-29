import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  carpetaRaiz,
  construirGrafo,
  filtrarGrafo,
  maticesPorCarpeta,
  subgrafoLocal,
  vecinosPorNodo,
} from "./graph.ts";
import { crearResolutor, type NotaConEnlaces } from "./links.ts";

const enlace = (destino: string) => ({ destino, embed: false });

const notas: NotaConEnlaces[] = [
  { ruta: "A/uno.md", titulo: "uno", enlaces: [enlace("dos"), enlace("uno"), enlace("fantasma")] },
  { ruta: "A/dos.md", titulo: "dos", enlaces: [enlace("uno"), enlace("tres")] },
  { ruta: "B/tres.md", titulo: "tres", enlaces: [enlace("cuatro")] },
  { ruta: "B/cuatro.md", titulo: "cuatro", enlaces: [] },
  { ruta: "sola.md", titulo: "sola", enlaces: [] },
];

const grafo = construirGrafo(notas, crearResolutor(notas.map((nota) => nota.ruta)));

describe("construirGrafo", () => {
  it("crea un nodo por nota", () => {
    assert.equal(grafo.nodos.length, 5);
  });

  it("no crea aristas hacia sí misma ni hacia notas inexistentes", () => {
    assert.equal(
      grafo.aristas.some((arista) => arista.origen === arista.destino),
      false,
    );
    assert.equal(grafo.aristas.length, 3);
  });

  it("no duplica la arista cuando el enlace va en ambos sentidos", () => {
    const pares = grafo.aristas.filter(
      (arista) =>
        [arista.origen, arista.destino].sort().join() === ["A/dos.md", "A/uno.md"].sort().join(),
    );
    assert.equal(pares.length, 1);
  });

  it("calcula el grado de cada nota", () => {
    const grados = Object.fromEntries(grafo.nodos.map((nodo) => [nodo.titulo, nodo.grado]));
    assert.deepEqual(grados, { uno: 1, dos: 2, tres: 2, cuatro: 1, sola: 0 });
  });
});

describe("subgrafoLocal", () => {
  it("con profundidad 1 trae solo los vecinos directos", () => {
    const local = subgrafoLocal(grafo, "A/dos.md", 1);
    assert.deepEqual(local.nodos.map((nodo) => nodo.id).sort(), ["A/dos.md", "A/uno.md", "B/tres.md"]);
  });

  it("con profundidad 2 llega más lejos", () => {
    const local = subgrafoLocal(grafo, "A/dos.md", 2);
    assert.equal(local.nodos.length, 4);
    assert.equal(local.aristas.length, 3);
  });

  it("devuelve un grafo vacío si el centro no existe", () => {
    assert.deepEqual(subgrafoLocal(grafo, "No/existe.md", 2), { nodos: [], aristas: [] });
  });
});

describe("filtrarGrafo", () => {
  it("sin filtros devuelve el mismo grafo", () => {
    assert.equal(filtrarGrafo(grafo, { texto: "", carpeta: "", huerfanas: true }), grafo);
  });

  it("filtra por carpeta y solo conserva aristas internas", () => {
    const filtrado = filtrarGrafo(grafo, { texto: "", carpeta: "B", huerfanas: true });
    assert.deepEqual(filtrado.nodos.map((nodo) => nodo.id).sort(), ["B/cuatro.md", "B/tres.md"]);
    assert.equal(filtrado.aristas.length, 1);
  });

  it("filtra por texto sin distinguir mayúsculas", () => {
    assert.deepEqual(
      filtrarGrafo(grafo, { texto: "TRES", carpeta: "", huerfanas: true }).nodos.map((nodo) => nodo.id),
      ["B/tres.md"],
    );
  });

  it("puede ocultar las notas sin enlaces", () => {
    const filtrado = filtrarGrafo(grafo, { texto: "", carpeta: "", huerfanas: false });
    assert.equal(
      filtrado.nodos.some((nodo) => nodo.id === "sola.md"),
      false,
    );
    assert.equal(filtrado.nodos.length, 4);
  });
});

describe("utilidades del grafo", () => {
  it("vecinosPorNodo es simétrico", () => {
    const vecinos = vecinosPorNodo(grafo);
    assert.ok(vecinos.get("A/uno.md")?.has("A/dos.md"));
    assert.ok(vecinos.get("A/dos.md")?.has("A/uno.md"));
    assert.equal(vecinos.get("sola.md")?.size, 0);
  });

  it("carpetaRaiz toma el primer segmento", () => {
    assert.equal(carpetaRaiz("a/b/c"), "a");
    assert.equal(carpetaRaiz("a"), "a");
    assert.equal(carpetaRaiz(""), "");
  });

  it("asigna un matiz distinto a cada carpeta raíz", () => {
    const matices = maticesPorCarpeta(grafo);
    assert.equal(matices.size, 2);
    assert.notEqual(matices.get("A"), matices.get("B"));
  });
});
