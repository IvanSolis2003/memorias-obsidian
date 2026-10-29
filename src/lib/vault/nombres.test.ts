import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { carpetaDeRuta, carpetasDeRutas, validarNombreNota } from "./nombres.ts";
import { agruparPorTag } from "./tags.ts";

describe("validarNombreNota", () => {
  const existentes = ["Carpeta/Nota.md", "Raiz.md"];

  it("arma la ruta con la carpeta y la extensión", () => {
    assert.deepEqual(validarNombreNota("  Mi idea.md ", "Carpeta", existentes), {
      ok: true,
      ruta: "Carpeta/Mi idea.md",
    });
    assert.deepEqual(validarNombreNota("Suelta", "", existentes), { ok: true, ruta: "Suelta.md" });
  });

  it("pide un nombre cuando está vacío", () => {
    assert.equal(validarNombreNota("  .md ", "", existentes).ok, false);
  });

  it("rechaza caracteres que Obsidian no permite", () => {
    for (const nombre of ["a/b", "a:b", "a|b", "a#b", "a^b", "a[b]", 'a"b', "a*b", "a?b", "a<b>"]) {
      assert.equal(validarNombreNota(nombre, "", existentes).ok, false, nombre);
    }
  });

  it("rechaza nombres que empiezan o terminan con punto", () => {
    assert.equal(validarNombreNota(".oculta", "", existentes).ok, false);
    assert.equal(validarNombreNota("termina.", "", existentes).ok, false);
  });

  it("rechaza nombres de más de 150 caracteres", () => {
    assert.equal(validarNombreNota("a".repeat(151), "", existentes).ok, false);
    assert.equal(validarNombreNota("a".repeat(150), "", existentes).ok, true);
  });

  it("rechaza duplicados sin distinguir mayúsculas", () => {
    assert.equal(validarNombreNota("nota", "Carpeta", existentes).ok, false);
    assert.equal(validarNombreNota("RAIZ", "", existentes).ok, false);
    assert.equal(validarNombreNota("Nota", "", existentes).ok, true);
  });
});

describe("carpetas", () => {
  it("carpetasDeRutas incluye las carpetas intermedias, ordenadas", () => {
    assert.deepEqual(carpetasDeRutas(["b/x/y.md", "a/z.md", "suelta.md"]), ["a", "b", "b/x"]);
  });

  it("carpetaDeRuta devuelve vacío para notas en la raíz", () => {
    assert.equal(carpetaDeRuta("a/b/c.md"), "a/b");
    assert.equal(carpetaDeRuta("c.md"), "");
    assert.equal(carpetaDeRuta(null), "");
  });
});

describe("agruparPorTag", () => {
  const grupos = agruparPorTag([
    { ruta: "a.md", titulo: "Beta", tags: ["nextjs", "Neon"] },
    { ruta: "b.md", titulo: "alfa", tags: ["NextJS", "nextjs"] },
    { ruta: "c.md", titulo: "Gamma", tags: ["neon"] },
    { ruta: "d.md", titulo: "Delta", tags: [] },
  ]);

  it("une etiquetas que solo difieren en mayúsculas", () => {
    assert.deepEqual(
      grupos.map((grupo) => [grupo.tag.toLowerCase(), grupo.notas.length]),
      [
        ["neon", 2],
        ["nextjs", 2],
      ],
    );
  });

  it("no cuenta dos veces la misma etiqueta dentro de una nota", () => {
    const nextjs = grupos.find((grupo) => grupo.tag.toLowerCase() === "nextjs");
    assert.deepEqual(
      nextjs?.notas.map((nota) => nota.ruta),
      ["b.md", "a.md"],
    );
  });

  it("ordena por cantidad de notas y luego alfabéticamente", () => {
    const orden = agruparPorTag([
      { ruta: "1.md", titulo: "1", tags: ["b"] },
      { ruta: "2.md", titulo: "2", tags: ["a"] },
      { ruta: "3.md", titulo: "3", tags: ["c", "a"] },
    ]);
    assert.deepEqual(
      orden.map((grupo) => grupo.tag),
      ["a", "b", "c"],
    );
  });
});
