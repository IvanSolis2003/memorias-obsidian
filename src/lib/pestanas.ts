import { rutaDeUrl, tituloDeRuta } from "./vault/url";

export type Pestana = {
  id: string;
  url: string;
};

export type EstadoPestanas = {
  pestanas: Pestana[];
  activa: string;
};

function crearPestana(url: string): Pestana {
  return { id: crypto.randomUUID(), url };
}

export function estadoInicial(url: string): EstadoPestanas {
  const pestana = crearPestana(url);
  return { pestanas: [pestana], activa: pestana.id };
}

export function esEstadoValido(valor: unknown): valor is EstadoPestanas {
  if (!valor || typeof valor !== "object") return false;
  const { pestanas, activa } = valor as Partial<EstadoPestanas>;
  return (
    Array.isArray(pestanas) &&
    pestanas.length > 0 &&
    pestanas.every((p) => typeof p?.id === "string" && typeof p?.url === "string") &&
    typeof activa === "string" &&
    pestanas.some((p) => p.id === activa)
  );
}

export function registrarUrl(estado: EstadoPestanas, url: string): EstadoPestanas {
  if (estado.pestanas.find((p) => p.id === estado.activa)?.url === url) return estado;
  return {
    ...estado,
    pestanas: estado.pestanas.map((p) => (p.id === estado.activa ? { ...p, url } : p)),
  };
}

export function abrirPestana(estado: EstadoPestanas, url: string): EstadoPestanas {
  const nueva = crearPestana(url);
  return { pestanas: [...estado.pestanas, nueva], activa: nueva.id };
}

export function activarPestana(estado: EstadoPestanas, id: string): EstadoPestanas {
  return estado.pestanas.some((p) => p.id === id) ? { ...estado, activa: id } : estado;
}

export function cerrarPestana(estado: EstadoPestanas, id: string): EstadoPestanas {
  const indice = estado.pestanas.findIndex((p) => p.id === id);
  if (indice === -1 || estado.pestanas.length === 1) return estado;
  const pestanas = estado.pestanas.filter((p) => p.id !== id);
  const activa =
    id === estado.activa ? pestanas[Math.min(indice, pestanas.length - 1)].id : estado.activa;
  return { pestanas, activa };
}

export function tituloDeUrl(url: string) {
  const ruta = rutaDeUrl(url);
  if (ruta) return tituloDeRuta(ruta);
  if (url === "/grafo") return "Grafo";
  if (url === "/conexiones") return "Conexiones";
  if (url === "/cuenta") return "Cuenta";
  return "Memorias Ivan";
}

export function carpetaDeUrl(url: string) {
  const ruta = rutaDeUrl(url);
  const corte = ruta ? ruta.lastIndexOf("/") : -1;
  return ruta && corte !== -1 ? ruta.slice(0, corte) : "";
}
