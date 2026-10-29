import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  construirEntrantes,
  crearResolutor,
  filtrarSugerencias,
  nombresParaEnlazar,
  resolverSalientes,
} from "./links.ts";

const RUTAS = ["A/Plan.md", "B/Plan.md", "B/Otra.md", "Raiz.md", "img/foto.png", "B/sub/Hija.md"];

describe("resolutor de enlaces", () => {
  const resolutor = crearResolutor(RUTAS);

  it("resuelve por nombre sin importar mayúsculas", () => {
    assert.equal(resolutor.resolverNota("raiz", "A/x.md"), "Raiz.md");
  });

  it("con nombres repetidos prefiere la carpeta más cercana", () => {
    assert.equal(resolutor.resolverNota("Plan", "B/Otra.md"), "B/Plan.md");
    assert.equal(resolutor.resolverNota("Plan", "A/x.md"), "A/Plan.md");
  });

  it("resuelve rutas parciales por sufijo", () => {
    assert.equal(resolutor.resolverNota("B/Plan", "Raiz.md"), "B/Plan.md");
    assert.equal(resolutor.resolverNota("sub/Hija", "Raiz.md"), "B/sub/Hija.md");
  });

  it("acepta la extensión .md en el destino", () => {
    assert.equal(resolutor.resolverNota("Otra.md", "Raiz.md"), "B/Otra.md");
  });

  it("resuelve rutas relativas", () => {
    assert.equal(resolutor.resolverNota("./Otra", "B/Plan.md"), "B/Otra.md");
    assert.equal(resolutor.resolverNota("../A/Plan", "B/Otra.md"), "A/Plan.md");
  });

  it("no sale de la raíz con rutas relativas", () => {
    assert.equal(resolutor.resolverNota("../../x", "Raiz.md"), null);
  });

  it("un destino vacío apunta a la propia nota", () => {
    assert.equal(resolutor.resolverNota("", "B/Otra.md"), "B/Otra.md");
  });

  it("devuelve null si la nota no existe", () => {
    assert.equal(resolutor.resolverNota("Inexistente", "Raiz.md"), null);
  });

  it("resuelve archivos adjuntos", () => {
    assert.equal(resolutor.resolverArchivo("foto.png", "Raiz.md"), "img/foto.png");
    assert.equal(resolutor.resolverArchivo("nada.png", "Raiz.md"), null);
  });
});

describe("enlaces entrantes y salientes", () => {
  const resolutor = crearResolutor(RUTAS);
  const notas = [
    { ruta: "Raiz.md", titulo: "Raiz", enlaces: [{ destino: "Otra", embed: false }, { destino: "Raiz", embed: false }] },
    { ruta: "B/Otra.md", titulo: "Otra", enlaces: [{ destino: "Raiz", embed: false }] },
    { ruta: "A/Plan.md", titulo: "Plan", enlaces: [{ destino: "Otra", embed: false }] },
  ];

  it("construye los entrantes sin contar la nota consigo misma", () => {
    const entrantes = construirEntrantes(notas, resolutor);
    assert.deepEqual(
      entrantes.get("B/Otra.md")?.map((nota) => nota.ruta),
      ["A/Plan.md", "Raiz.md"],
    );
    assert.deepEqual(
      entrantes.get("Raiz.md")?.map((nota) => nota.ruta),
      ["B/Otra.md"],
    );
  });

  it("clasifica las salientes en nota, archivo e inexistente", () => {
    const salientes = resolverSalientes(
      [
        { destino: "Otra", embed: false },
        { destino: "foto.png", embed: true },
        { destino: "Fantasma", embed: false },
        { destino: "Otra", embed: false },
        { destino: "Raiz", embed: false },
      ],
      "Raiz.md",
      resolutor,
    );
    assert.deepEqual(
      salientes.map((saliente) => [saliente.tipo, saliente.ruta]),
      [
        ["nota", "B/Otra.md"],
        ["archivo", "img/foto.png"],
        ["inexistente", null],
      ],
    );
  });
});

describe("sugerencias al escribir enlaces", () => {
  const sugerencias = nombresParaEnlazar(RUTAS);

  it("usa la ruta completa solo cuando el nombre se repite", () => {
    const textos = sugerencias.map((sugerencia) => sugerencia.texto);
    assert.ok(textos.includes("A/Plan"));
    assert.ok(textos.includes("B/Plan"));
    assert.ok(textos.includes("Otra"));
    assert.ok(!textos.includes("Plan"));
  });

  it("no ofrece adjuntos", () => {
    assert.ok(!sugerencias.some((sugerencia) => sugerencia.ruta.endsWith(".png")));
  });

  it("filtra poniendo primero las que empiezan con lo escrito", () => {
    const filtradas = filtrarSugerencias(sugerencias, "ot");
    assert.equal(filtradas[0].texto, "Otra");
  });

  it("sin consulta respeta el límite", () => {
    assert.equal(filtrarSugerencias(sugerencias, "", 2).length, 2);
  });
});
