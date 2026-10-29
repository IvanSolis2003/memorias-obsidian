import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  carpetaDestino,
  conSufijo,
  enlaceDeAdjunto,
  formatearTamano,
  LIMITE_ADJUNTO_BYTES,
  nombrePegado,
  sanearNombre,
  validarAdjunto,
  verificarContenido,
} from "./attachments.ts";
import { esAdjunto, extensionDe, tipoDeArchivo } from "./tiposArchivo.ts";

const bytes = (...valores: number[]) => new Uint8Array(valores);
const ascii = (texto: string) => new TextEncoder().encode(texto);

describe("tipos de archivo", () => {
  it("obtiene la extensión en minúsculas", () => {
    assert.equal(extensionDe("fotos/Foto.PNG"), "png");
    assert.equal(extensionDe("sin-extension"), "");
  });

  it("las notas no son adjuntos", () => {
    assert.equal(esAdjunto("a.md"), false);
    assert.equal(esAdjunto("a.pdf"), true);
    assert.equal(esAdjunto("a.exe"), false);
  });

  it("no confunde propiedades del objeto con extensiones", () => {
    assert.equal(tipoDeArchivo("a.constructor"), null);
    assert.equal(esAdjunto("a.__proto__"), false);
  });
});

describe("nombres de adjuntos", () => {
  it("quita la ruta y los caracteres prohibidos", () => {
    assert.equal(sanearNombre("C:\\fotos\\mi*foto?.PNG"), "mi foto.png");
    assert.equal(sanearNombre("../../etc/pasa<>wd.txt"), "pasa wd.txt");
  });

  it("usa un nombre por defecto cuando no queda nada", () => {
    assert.equal(sanearNombre("***.png"), "archivo.png");
  });

  it("limita el largo del nombre", () => {
    assert.equal(sanearNombre(`${"a".repeat(300)}.pdf`).length, 120 + ".pdf".length);
  });

  it("agrega sufijos numéricos antes de la extensión", () => {
    assert.equal(conSufijo("foto.png", 0), "foto.png");
    assert.equal(conSufijo("foto.png", 2), "foto 2.png");
    assert.equal(conSufijo("notas", 1), "notas 1");
  });

  it("nombra las imágenes pegadas con la fecha", () => {
    assert.equal(nombrePegado(new Date(2026, 9, 29, 8, 5, 3), "png"), "Pasted image 20261029080503.png");
  });
});

describe("carpeta de destino", () => {
  it("usa Adjuntos si no hay configuración", () => {
    assert.equal(carpetaDestino(undefined, "a/b"), "Adjuntos");
    assert.equal(carpetaDestino("  ", "a/b"), "Adjuntos");
  });

  it("entiende las opciones de Obsidian", () => {
    assert.equal(carpetaDestino("/", "a/b"), "");
    assert.equal(carpetaDestino("./", "a/b"), "a/b");
    assert.equal(carpetaDestino("./img", "a/b"), "a/b/img");
    assert.equal(carpetaDestino("/Recursos/", "a/b"), "Recursos");
  });
});

describe("enlaces y tamaños", () => {
  it("incrusta imágenes, audio y PDF, y enlaza el resto", () => {
    assert.equal(enlaceDeAdjunto("a.png"), "![[a.png]]");
    assert.equal(enlaceDeAdjunto("a.pdf"), "![[a.pdf]]");
    assert.equal(enlaceDeAdjunto("a.docx"), "[[a.docx]]");
  });

  it("formatea tamaños", () => {
    assert.equal(formatearTamano(512), "512 B");
    assert.equal(formatearTamano(2048), "2.0 KB");
    assert.equal(formatearTamano(50 * 1024), "50 KB");
    assert.equal(formatearTamano(3 * 1024 * 1024), "3.0 MB");
  });
});

describe("validarAdjunto", () => {
  it("acepta un archivo permitido con tipo coherente", () => {
    assert.equal(validarAdjunto("a.png", "image/png", 100), null);
    assert.equal(validarAdjunto("a.png", "application/octet-stream", 100), null);
    assert.equal(validarAdjunto("a.txt", "text/plain; charset=utf-8", 100), null);
  });

  it("rechaza extensiones no permitidas", () => {
    assert.ok(validarAdjunto("virus.exe", "application/x-msdownload", 100));
    assert.ok(validarAdjunto("sin-extension", "", 100));
  });

  it("rechaza archivos vacíos o demasiado grandes", () => {
    assert.ok(validarAdjunto("a.png", "image/png", 0));
    assert.ok(validarAdjunto("a.png", "image/png", LIMITE_ADJUNTO_BYTES + 1));
    assert.equal(validarAdjunto("a.png", "image/png", LIMITE_ADJUNTO_BYTES), null);
  });

  it("rechaza un tipo que no coincide con la extensión", () => {
    assert.ok(validarAdjunto("a.png", "application/pdf", 100));
  });
});

describe("verificarContenido", () => {
  it("acepta firmas reales", () => {
    assert.equal(verificarContenido(bytes(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a), "png"), null);
    assert.equal(verificarContenido(bytes(0xff, 0xd8, 0xff, 0xe0), "jpg"), null);
    assert.equal(verificarContenido(ascii("%PDF-1.7"), "pdf"), null);
    assert.equal(verificarContenido(ascii("GIF89a"), "gif"), null);
    assert.equal(verificarContenido(bytes(0x50, 0x4b, 0x03, 0x04), "docx"), null);
  });

  it("rechaza archivos que fingen ser otra cosa", () => {
    assert.ok(verificarContenido(ascii("<html>no soy png</html>"), "png"));
    assert.ok(verificarContenido(ascii("MZ ejecutable"), "pdf"));
    assert.ok(verificarContenido(ascii("texto"), "docx"));
  });

  it("acepta SVG sin código activo", () => {
    assert.equal(verificarContenido(ascii('<svg xmlns="http://www.w3.org/2000/svg"><circle r="1"/></svg>'), "svg"), null);
  });

  it("rechaza SVG con scripts, javascript:, foreignObject o eventos", () => {
    for (const peligro of [
      "<svg><script>alert(1)</script></svg>",
      '<svg><a href="javascript:alert(1)"/></svg>',
      "<svg><foreignObject/></svg>",
      '<svg onload="alert(1)"></svg>',
    ]) {
      assert.ok(verificarContenido(ascii(peligro), "svg"), peligro);
    }
  });

  it("rechaza texto con bytes nulos", () => {
    assert.equal(verificarContenido(ascii("hola"), "txt"), null);
    assert.ok(verificarContenido(bytes(0x68, 0x00, 0x69), "txt"));
  });
});
