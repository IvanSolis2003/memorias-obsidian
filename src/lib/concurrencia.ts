export async function mapConLimite<T, R>(
  elementos: T[],
  limite: number,
  tarea: (elemento: T) => Promise<R>,
): Promise<R[]> {
  const resultados = new Array<R>(elementos.length);
  let siguiente = 0;

  async function trabajador() {
    while (siguiente < elementos.length) {
      const indice = siguiente++;
      resultados[indice] = await tarea(elementos[indice]);
    }
  }

  await Promise.all(Array.from({ length: Math.min(limite, elementos.length) }, trabajador));
  return resultados;
}
