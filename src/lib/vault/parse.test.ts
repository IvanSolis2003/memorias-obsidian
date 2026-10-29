import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { analizarNota, enlaceDesdeInterior, separarFrontmatter, VERSION_ANALISIS } from "./parse.ts";

describe("etiquetas del frontmatter", () => {
  it("lee tags como lista", () => {
    assert.deepEqual(analizarNota("---\ntags: [a, b]\n---\ncuerpo").tags, ["a", "b"]);
  });

  it("lee tags como texto con almohadilla y separadores", () => {
    assert.deepEqual(analizarNota("---\ntags: '#a #b, c'\n---\ncuerpo").tags, ["a", "b", "c"]);
  });

  it("lee etiquetas escritas en español", () => {
    assert.deepEqual(analizarNota("---\netiquetas: [kyocera, bugfix]\n---\ncuerpo").tags, ["kyocera", "bugfix"]);
  });

  it("lee la clave etiqueta en singular", () => {
    assert.deepEqual(analizarNota("---\netiqueta: n8n\n---\ncuerpo").tags, ["n8n"]);
  });

  it("une las etiquetas de varias claves sin repetirlas", () => {
    const nota = analizarNota("---\ntags: [a]\netiquetas: [a, b]\n---\ncuerpo #c");
    assert.deepEqual(nota.tags, ["a", "b", "c"]);
  });

  it("funciona con saltos de línea de Windows", () => {
    assert.deepEqual(analizarNota("---\r\netiquetas: [uno, dos]\r\n---\r\ncuerpo").tags, ["uno", "dos"]);
  });

  it("ignora valores que no son texto", () => {
    assert.deepEqual(analizarNota("---\netiquetas: [1, true, ok]\n---\ncuerpo").tags, ["ok"]);
  });

  it("sin etiquetas devuelve lista vacía", () => {
    assert.deepEqual(analizarNota("---\ntitulo: x\n---\ncuerpo").tags, []);
  });
});

describe("etiquetas en el texto", () => {
  it("detecta etiquetas anidadas y simples", () => {
    assert.deepEqual(analizarNota("texto #proyecto/sub y #otro").tags, ["proyecto/sub", "otro"]);
  });

  it("detecta etiquetas en listas y tareas", () => {
    assert.deepEqual(analizarNota("- #pendiente\n- [ ] tarea #urgente").tags, ["pendiente", "urgente"]);
  });

  it("ignora números solos, encabezados y anclas de URL", () => {
    const nota = analizarNota("# Titulo\n## Otro\n#123\nvisita https://x.com/#seccion");
    assert.deepEqual(nota.tags, []);
  });

  it("ignora etiquetas dentro de código y comentarios", () => {
    const texto = "`#codigo` y\n```\n#bloque\n```\n%% #oculta %%\n#visible";
    assert.deepEqual(analizarNota(texto).tags, ["visible"]);
  });
});

describe("enlaces", () => {
  it("lee wikilinks con alias, sección y bloque", () => {
    const { enlaces } = analizarNota("[[Nota A|alias]] [[Nota B#Seccion]] [[Nota C#^bloque]]");
    assert.deepEqual(enlaces, [
      { destino: "Nota A", embed: false, alias: "alias" },
      { destino: "Nota B", embed: false, seccion: "Seccion" },
      { destino: "Nota C", embed: false, seccion: "^bloque" },
    ]);
  });

  it("distingue las incrustaciones", () => {
    const { enlaces } = analizarNota("![[imagen.png|300]] ![[Otra nota]]");
    assert.deepEqual(
      enlaces.map((enlace) => [enlace.destino, enlace.embed]),
      [
        ["imagen.png", true],
        ["Otra nota", true],
      ],
    );
  });

  it("entiende el alias escapado dentro de tablas", () => {
    const { enlaces } = analizarNota("| [[Nota A\\|alias]] | [[Nota B]] |");
    assert.deepEqual(
      enlaces.map((enlace) => enlace.destino),
      ["Nota A", "Nota B"],
    );
  });

  it("acepta enlaces que solo apuntan a una sección", () => {
    const { enlaces } = analizarNota("[[#Encabezado]]");
    assert.deepEqual(enlaces, [{ destino: "", embed: false, seccion: "Encabezado" }]);
  });

  it("lee enlaces markdown relativos, decodifica y quita la extensión", () => {
    const { enlaces } = analizarNota("[x](Mi%20nota.md#Sec) ![img](fotos/a.png)");
    assert.deepEqual(enlaces, [
      { destino: "Mi nota", embed: false, seccion: "Sec" },
      { destino: "fotos/a.png", embed: true },
    ]);
  });

  it("ignora enlaces externos y anclas", () => {
    const { enlaces } = analizarNota("[a](https://x.com) [b](mailto:a@b.cl) [c](#ancla) [d](//cdn.x.com/y)");
    assert.deepEqual(enlaces, []);
  });

  it("no cuenta enlaces dentro de código", () => {
    const { enlaces } = analizarNota("`[[no]]`\n```\n[[tampoco]]\n```\n[[si]]");
    assert.deepEqual(
      enlaces.map((enlace) => enlace.destino),
      ["si"],
    );
  });

  it("no repite enlaces idénticos", () => {
    assert.equal(analizarNota("[[A]] [[A]] [[a]]").enlaces.length, 2);
  });

  it("enlaceDesdeInterior separa destino, sección y alias", () => {
    assert.deepEqual(enlaceDesdeInterior("Nota#Sec|texto", false), {
      destino: "Nota",
      embed: false,
      seccion: "Sec",
      alias: "texto",
    });
  });

  it("enlace markdown con paréntesis en el nombre", { todo: true }, () => {
    const { enlaces } = analizarNota("[x](Mi_nota_(v2).md)");
    assert.equal(enlaces[0]?.destino, "Mi_nota_(v2)");
  });
});

describe("títulos y frontmatter", () => {
  it("extrae los títulos con su nivel y quita los # finales", () => {
    const { titulos } = analizarNota("# Uno\n## Dos ##\n```\n# no\n```\ntexto");
    assert.deepEqual(titulos, [
      { nivel: 1, texto: "Uno" },
      { nivel: 2, texto: "Dos" },
    ]);
  });

  it("convierte las fechas del frontmatter a texto", () => {
    const { propiedades } = analizarNota("---\nfecha: 2026-10-29\n---\ncuerpo");
    assert.equal(typeof propiedades.fecha, "string");
    assert.ok(String(propiedades.fecha).startsWith("2026-10-29"));
  });

  it("si el frontmatter está roto conserva el texto y no falla", () => {
    const resultado = separarFrontmatter("---\nclave: [sin cerrar\n---\n# Titulo");
    assert.deepEqual(resultado.propiedades, {});
    assert.ok(resultado.cuerpo.includes("# Titulo"));
  });

  it("expone la versión del análisis como número positivo", () => {
    assert.ok(Number.isInteger(VERSION_ANALISIS) && VERSION_ANALISIS > 0);
  });
});
