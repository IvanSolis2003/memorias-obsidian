export type NotaConTags = {
  ruta: string;
  titulo: string;
  tags: string[];
};

export type GrupoTag = {
  tag: string;
  notas: { ruta: string; titulo: string }[];
};

function comparar(a: string, b: string) {
  return a.localeCompare(b, "es", { numeric: true, sensitivity: "base" });
}

export function agruparPorTag(notas: NotaConTags[]): GrupoTag[] {
  const grupos = new Map<string, GrupoTag>();
  for (const nota of notas) {
    const vistos = new Set<string>();
    for (const etiqueta of nota.tags) {
      const llave = etiqueta.toLowerCase();
      if (vistos.has(llave)) continue;
      vistos.add(llave);
      const grupo = grupos.get(llave) ?? { tag: etiqueta, notas: [] };
      grupo.notas.push({ ruta: nota.ruta, titulo: nota.titulo });
      grupos.set(llave, grupo);
    }
  }
  return [...grupos.values()]
    .map((grupo) => ({ ...grupo, notas: grupo.notas.sort((a, b) => comparar(a.titulo, b.titulo)) }))
    .sort((a, b) => b.notas.length - a.notas.length || comparar(a.tag, b.tag));
}
