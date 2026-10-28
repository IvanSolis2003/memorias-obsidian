const prefijo = "memorias-obsidian:ultima-nota:";

export function guardarUltimaNota(clave: string, ruta: string) {
  try {
    localStorage.setItem(prefijo + clave, ruta);
  } catch {}
}

export function leerUltimaNota(clave: string) {
  try {
    return localStorage.getItem(prefijo + clave);
  } catch {
    return null;
  }
}
