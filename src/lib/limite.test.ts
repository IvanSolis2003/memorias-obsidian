import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { ipDe, REGLAS_LIMITE, superaLimite } from "./limite.ts";

const regla = { maximo: 3, ventanaMs: 1000 };

describe("superaLimite", () => {
  it("permite hasta el máximo y bloquea el intento siguiente", () => {
    const resultados = [0, 1, 2, 3].map((i) => superaLimite("prueba-maximo", regla, 100 + i));
    assert.deepEqual(resultados, [false, false, false, true]);
  });

  it("vuelve a permitir cuando termina la ventana", () => {
    for (let i = 0; i < 4; i++) superaLimite("prueba-ventana", regla, 100);
    assert.equal(superaLimite("prueba-ventana", regla, 100 + regla.ventanaMs + 1), false);
  });

  it("cuenta cada clave por separado", () => {
    for (let i = 0; i < 4; i++) superaLimite("prueba-a", regla, 100);
    assert.equal(superaLimite("prueba-b", regla, 100), false);
  });
});

describe("ipDe", () => {
  const pedido = (cabeceras: Record<string, string>) => ({ headers: new Headers(cabeceras) }) as never;

  it("usa la primera IP de x-forwarded-for", () => {
    assert.equal(ipDe(pedido({ "x-forwarded-for": "1.2.3.4, 5.6.7.8" })), "1.2.3.4");
  });

  it("recurre a x-real-ip y luego a un valor por defecto", () => {
    assert.equal(ipDe(pedido({ "x-real-ip": "9.9.9.9" })), "9.9.9.9");
    assert.equal(ipDe(pedido({})), "desconocida");
  });
});

describe("reglas de límite", () => {
  it("protegen las rutas de autenticación y del conector", () => {
    for (const ruta of [
      "/api/auth/github/login",
      "/api/auth/github/callback",
      "/api/oauth/authorize",
      "/api/oauth/register",
      "/api/oauth/token",
    ]) {
      assert.ok(REGLAS_LIMITE[ruta], ruta);
      assert.ok(REGLAS_LIMITE[ruta].maximo > 0 && REGLAS_LIMITE[ruta].ventanaMs > 0);
    }
  });
});
