const prefijo = "memorias-ivan:marcadores:";
const VACIO: string[] = [];

const oyentes = new Set<() => void>();
const cache = new Map<string, { crudo: string | null; lista: string[] }>();

function leerCrudo(clave: string) {
  try {
    return localStorage.getItem(prefijo + clave);
  } catch {
    return null;
  }
}

function analizar(crudo: string | null) {
  if (!crudo) return VACIO;
  try {
    const datos: unknown = JSON.parse(crudo);
    return Array.isArray(datos) ? datos.filter((ruta): ruta is string => typeof ruta === "string") : VACIO;
  } catch {
    return VACIO;
  }
}

export function leerMarcadores(clave: string) {
  const crudo = leerCrudo(clave);
  const guardado = cache.get(clave);
  if (guardado && guardado.crudo === crudo) return guardado.lista;
  const lista = analizar(crudo);
  cache.set(clave, { crudo, lista });
  return lista;
}

export function marcadoresVacios() {
  return VACIO;
}

export function alternarMarcador(clave: string, ruta: string) {
  const actuales = leerMarcadores(clave);
  const nuevos = actuales.includes(ruta) ? actuales.filter((marcada) => marcada !== ruta) : [...actuales, ruta];
  try {
    localStorage.setItem(prefijo + clave, JSON.stringify(nuevos));
  } catch {}
  oyentes.forEach((oyente) => oyente());
}

export function suscribirMarcadores(oyente: () => void) {
  oyentes.add(oyente);
  window.addEventListener("storage", oyente);
  return () => {
    oyentes.delete(oyente);
    window.removeEventListener("storage", oyente);
  };
}
