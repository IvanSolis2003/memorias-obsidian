import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  abrirPestana,
  activarPestana,
  carpetaDeUrl,
  cerrarPestana,
  esEstadoValido,
  estadoInicial,
  registrarUrl,
  tituloDeUrl,
} from "./pestanas.ts";

describe("estado de pestañas", () => {
  it("empieza con una pestaña activa", () => {
    const estado = estadoInicial("/n/a.md");
    assert.equal(estado.pestanas.length, 1);
    assert.equal(estado.activa, estado.pestanas[0].id);
  });

  it("abrir agrega y activa la nueva", () => {
    const estado = abrirPestana(estadoInicial("/n/a.md"), "/n/b.md");
    assert.equal(estado.pestanas.length, 2);
    assert.equal(estado.pestanas.find((p) => p.id === estado.activa)?.url, "/n/b.md");
  });

  it("registrarUrl cambia solo la pestaña activa y no crea objetos nuevos si no cambia", () => {
    const base = abrirPestana(estadoInicial("/n/a.md"), "/n/b.md");
    assert.equal(registrarUrl(base, "/n/b.md"), base);
    const cambiado = registrarUrl(base, "/n/c.md");
    assert.deepEqual(
      cambiado.pestanas.map((p) => p.url),
      ["/n/a.md", "/n/c.md"],
    );
  });

  it("activar ignora ids que no existen", () => {
    const estado = estadoInicial("/n/a.md");
    assert.equal(activarPestana(estado, "no-existe"), estado);
  });

  it("no deja cerrar la última pestaña", () => {
    const estado = estadoInicial("/n/a.md");
    assert.equal(cerrarPestana(estado, estado.activa), estado);
  });

  it("al cerrar la activa pasa a una vecina", () => {
    let estado = estadoInicial("/n/a.md");
    estado = abrirPestana(estado, "/n/b.md");
    estado = abrirPestana(estado, "/n/c.md");
    const activa = estado.activa;
    const cerrada = cerrarPestana(estado, activa);
    assert.equal(cerrada.pestanas.length, 2);
    assert.equal(cerrada.pestanas.find((p) => p.id === cerrada.activa)?.url, "/n/b.md");
  });

  it("al cerrar otra pestaña conserva la activa", () => {
    const base = abrirPestana(estadoInicial("/n/a.md"), "/n/b.md");
    const primera = base.pestanas[0].id;
    assert.equal(cerrarPestana(base, primera).activa, base.activa);
  });
});

describe("validación del estado guardado", () => {
  it("acepta un estado coherente", () => {
    assert.equal(esEstadoValido(estadoInicial("/n/a.md")), true);
  });

  it("rechaza estados dañados", () => {
    assert.equal(esEstadoValido(null), false);
    assert.equal(esEstadoValido({}), false);
    assert.equal(esEstadoValido({ pestanas: [], activa: "x" }), false);
    assert.equal(esEstadoValido({ pestanas: [{ id: "1", url: "/" }], activa: "otro" }), false);
    assert.equal(esEstadoValido({ pestanas: [{ id: 1, url: "/" }], activa: "1" }), false);
  });
});

describe("títulos y carpetas desde la URL", () => {
  it("usa el nombre de la nota", () => {
    assert.equal(tituloDeUrl("/n/Carpeta/Mi%20nota.md"), "Mi nota");
  });

  it("nombra las pantallas fijas", () => {
    assert.equal(tituloDeUrl("/grafo"), "Grafo");
    assert.equal(tituloDeUrl("/conexiones"), "Conexiones");
    assert.equal(tituloDeUrl("/cuenta"), "Cuenta");
    assert.equal(tituloDeUrl("/otra"), "Memorias Obsidian");
  });

  it("obtiene la carpeta de la nota", () => {
    assert.equal(carpetaDeUrl("/n/A/B/x.md"), "A/B");
    assert.equal(carpetaDeUrl("/n/x.md"), "");
    assert.equal(carpetaDeUrl("/grafo"), "");
  });
});
