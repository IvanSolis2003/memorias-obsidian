const CARACTERES_PROHIBIDOS = /[*"\\/<>:|?#^[\]]/;
const LARGO_MAXIMO = 150;

export type ResultadoNombre = { ok: true; ruta: string } | { ok: false; mensaje: string };

export function validarNombreNota(
  nombreEscrito: string,
  carpeta: string,
  rutasExistentes: string[],
): ResultadoNombre {
  const nombre = nombreEscrito.trim().replace(/\.md$/i, "").trim();
  if (!nombre) return { ok: false, mensaje: "Escribe un nombre para la nota." };
  if (nombre.length > LARGO_MAXIMO) {
    return { ok: false, mensaje: `El nombre no puede superar los ${LARGO_MAXIMO} caracteres.` };
  }
  if (CARACTERES_PROHIBIDOS.test(nombre)) {
    return {
      ok: false,
      mensaje: 'El nombre no puede contener los caracteres * " \\ / < > : | ? # ^ [ ]',
    };
  }
  if (nombre.startsWith(".") || nombre.endsWith(".")) {
    return { ok: false, mensaje: "El nombre no puede empezar ni terminar con un punto." };
  }
  const ruta = carpeta ? `${carpeta}/${nombre}.md` : `${nombre}.md`;
  const minuscula = ruta.toLowerCase();
  if (rutasExistentes.some((existente) => existente.toLowerCase() === minuscula)) {
    return { ok: false, mensaje: "Ya existe una nota con ese nombre en esa carpeta." };
  }
  return { ok: true, ruta };
}

export function carpetasDeRutas(rutas: string[]): string[] {
  const carpetas = new Set<string>();
  for (const ruta of rutas) {
    const segmentos = ruta.split("/").slice(0, -1);
    segmentos.forEach((_, indice) => carpetas.add(segmentos.slice(0, indice + 1).join("/")));
  }
  return [...carpetas].sort((a, b) => a.localeCompare(b, "es", { numeric: true, sensitivity: "base" }));
}

export function carpetaDeRuta(ruta: string | null) {
  return ruta && ruta.includes("/") ? ruta.slice(0, ruta.lastIndexOf("/")) : "";
}
