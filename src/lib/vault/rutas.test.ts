import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { ErrorApi } from "../errores.ts";
import type { NodoArbol } from "../github.ts";
import { esRutaOculta, filtrarArchivos, normalizarBasePath, resumirArbol, validarRuta } from "./rutas.ts";

const rechazada = (error: unknown) => error instanceof ErrorApi && error.estado === 400;

describe("validarRuta", () => {
  it("acepta rutas normales, con espacios y acentos", () => {
    assert.equal(validarRuta("Carpeta/Sub carpeta/Canción.md"), "Carpeta/Sub carpeta/Canción.md");
    assert.equal(validarRuta("Nota.md"), "Nota.md");
  });

  for (const ruta of [
    "../secreto.md",
    "a/../b.md",
    "a/./b.md",
    "/absoluta.md",
    "a//b.md",
    "a/b/",
    "a\\b.md",
    "a\0b.md",
    ".obsidian/app.json",
    "carpeta/.oculta.md",
    ".env",
    "",
  ]) {
    it(`rechaza ${JSON.stringify(ruta)}`, () => {
      assert.throws(() => validarRuta(ruta), rechazada);
    });
  }

  it("rechaza lo que no es texto", () => {
    for (const valor of [undefined, null, 5, {}, ["a.md"]]) {
      assert.throws(() => validarRuta(valor), rechazada);
    }
  });

  it("rechaza rutas de más de 1024 caracteres", () => {
    assert.throws(() => validarRuta(`${"a".repeat(1025)}.md`), rechazada);
  });
});

describe("esRutaOculta", () => {
  it("detecta segmentos que empiezan con punto", () => {
    assert.equal(esRutaOculta(".git/config"), true);
    assert.equal(esRutaOculta("a/.b/c.md"), true);
    assert.equal(esRutaOculta("a/b.c/d.md"), false);
  });
});

describe("normalizarBasePath", () => {
  it("devuelve null cuando no hay subcarpeta", () => {
    assert.equal(normalizarBasePath(undefined), null);
    assert.equal(normalizarBasePath(null), null);
    assert.equal(normalizarBasePath("  /  "), null);
  });

  it("quita barras sobrantes", () => {
    assert.equal(normalizarBasePath("/Notas/Trabajo/"), "Notas/Trabajo");
  });

  it("rechaza .., rutas ocultas, barras invertidas y valores que no son texto", () => {
    for (const valor of ["a/../b", ".git", "a\\b", 5]) {
      assert.throws(() => normalizarBasePath(valor), rechazada);
    }
  });
});

describe("filtrado del árbol", () => {
  const nodos: NodoArbol[] = [
    { path: "vault/Nota.md", type: "blob", sha: "1", size: 10 },
    { path: "vault/img/foto.png", type: "blob", sha: "2", size: 20 },
    { path: "vault/.obsidian/app.json", type: "blob", sha: "3", size: 5 },
    { path: "vault/.obsidian", type: "tree", sha: "4" },
    { path: "otro/Ajena.md", type: "blob", sha: "5", size: 7 },
    { path: "vault/img", type: "tree", sha: "6" },
  ];

  it("filtrarArchivos devuelve solo archivos visibles bajo la subcarpeta", () => {
    assert.deepEqual(filtrarArchivos(nodos, "vault"), [
      { ruta: "Nota.md", sha: "1", tamano: 10 },
      { ruta: "img/foto.png", sha: "2", tamano: 20 },
    ]);
  });

  it("resumirArbol cuenta notas y adjuntos y detecta .obsidian", () => {
    assert.deepEqual(resumirArbol(nodos, "vault"), { notas: 1, adjuntos: 1, tieneObsidian: true });
  });

  it("sin subcarpeta considera todo el repositorio", () => {
    const resumen = resumirArbol(nodos, null);
    assert.equal(resumen.notas, 2);
    assert.equal(resumen.tieneObsidian, false);
  });
});
