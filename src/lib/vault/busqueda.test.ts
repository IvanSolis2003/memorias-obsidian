import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { resaltar } from "./busqueda.ts";

const unir = (segmentos: { texto: string; marca: boolean }[]) => segmentos.map((s) => s.texto).join("");

describe("resaltar", () => {
  it("marca los términos sin importar mayúsculas", () => {
    const segmentos = resaltar("Plan de Trabajo", ["plan"]);
    assert.deepEqual(segmentos, [
      { texto: "Plan", marca: true },
      { texto: " de Trabajo", marca: false },
    ]);
  });

  it("encuentra términos sin acentos dentro de texto con acentos", () => {
    const segmentos = resaltar("Canción rápida", ["cancion", "rapida"]);
    assert.deepEqual(
      segmentos.filter((s) => s.marca).map((s) => s.texto),
      ["Canción", "rápida"],
    );
  });

  it("nunca cambia el texto original", () => {
    const texto = "Árbol de decisión y más";
    assert.equal(unir(resaltar(texto, ["arbol", "decision"])), texto);
  });

  it("sin términos devuelve todo sin marcar", () => {
    assert.deepEqual(resaltar("hola", []), [{ texto: "hola", marca: false }]);
    assert.deepEqual(resaltar("hola", [""]), [{ texto: "hola", marca: false }]);
  });

  it("marca todas las apariciones", () => {
    const marcados = resaltar("ab ab ab", ["ab"]).filter((s) => s.marca);
    assert.equal(marcados.length, 3);
  });
});
