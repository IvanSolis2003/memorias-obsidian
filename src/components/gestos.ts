export type Punto = { x: number; y: number };

export type Direccion = "izquierda" | "derecha";

const DISTANCIA_MINIMA = 56;

export function detectarDeslizamiento(inicio: Punto, fin: Punto): Direccion | null {
  const dx = fin.x - inicio.x;
  const dy = fin.y - inicio.y;
  if (Math.abs(dx) < DISTANCIA_MINIMA || Math.abs(dx) < Math.abs(dy) * 1.5) {
    return null;
  }
  return dx > 0 ? "derecha" : "izquierda";
}

export function puntoDeToque(toque: { clientX: number; clientY: number }): Punto {
  return { x: toque.clientX, y: toque.clientY };
}
