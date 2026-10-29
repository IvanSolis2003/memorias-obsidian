import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { mapConLimite } from "./concurrencia.ts";

const pausa = (ms: number) => new Promise((resolver) => setTimeout(resolver, ms));

describe("mapConLimite", () => {
  it("conserva el orden de los resultados", async () => {
    const resultados = await mapConLimite([30, 5, 15], 3, async (ms) => {
      await pausa(ms);
      return ms * 2;
    });
    assert.deepEqual(resultados, [60, 10, 30]);
  });

  it("nunca supera el límite de tareas simultáneas", async () => {
    let activas = 0;
    let maximo = 0;
    await mapConLimite(Array.from({ length: 12 }, (_, i) => i), 3, async () => {
      activas++;
      maximo = Math.max(maximo, activas);
      await pausa(5);
      activas--;
    });
    assert.equal(maximo, 3);
  });

  it("con una lista vacía devuelve una lista vacía", async () => {
    assert.deepEqual(await mapConLimite([], 4, async (x) => x), []);
  });

  it("propaga el error de una tarea", async () => {
    await assert.rejects(
      mapConLimite([1, 2, 3], 2, async (x) => {
        if (x === 2) throw new Error("falló");
        return x;
      }),
      /falló/,
    );
  });
});
