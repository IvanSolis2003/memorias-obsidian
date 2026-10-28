const PREFIJO = "/n/";

export function urlDeNota(ruta: string) {
  return PREFIJO + ruta.split("/").map(encodeURIComponent).join("/");
}

export function urlDeAsset(ruta: string) {
  return `/api/vault/asset?ruta=${encodeURIComponent(ruta)}`;
}

export function rutaDeUrl(pathname: string | null): string | null {
  if (!pathname || !pathname.startsWith(PREFIJO)) return null;
  try {
    return pathname.slice(PREFIJO.length).split("/").map(decodeURIComponent).join("/");
  } catch {
    return null;
  }
}

export function tituloDeRuta(ruta: string) {
  return (ruta.split("/").pop() ?? ruta).replace(/\.md$/i, "");
}
