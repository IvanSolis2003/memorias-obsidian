export type EstadoHistorial = {
  pila: string[];
  indice: number;
};

let estado: EstadoHistorial = { pila: [], indice: -1 };
const oyentes = new Set<() => void>();

export function registrarNavegacion(ruta: string) {
  const { pila, indice } = estado;
  if (pila[indice] === ruta) return;
  if (indice > 0 && pila[indice - 1] === ruta) {
    estado = { pila, indice: indice - 1 };
  } else if (indice < pila.length - 1 && pila[indice + 1] === ruta) {
    estado = { pila, indice: indice + 1 };
  } else {
    estado = { pila: [...pila.slice(0, indice + 1), ruta], indice: indice + 1 };
  }
  oyentes.forEach((oyente) => oyente());
}

export function suscribirHistorial(oyente: () => void) {
  oyentes.add(oyente);
  return () => {
    oyentes.delete(oyente);
  };
}

export function leerHistorial() {
  return estado;
}
