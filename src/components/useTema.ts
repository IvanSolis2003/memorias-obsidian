"use client";

import { useCallback, useEffect, useSyncExternalStore } from "react";

export type Tema = "oscuro" | "claro";

const CLAVE = "memorias-obsidian:tema";
const EVENTO = "memorias-obsidian:cambio-tema";

function suscribir(avisar: () => void) {
  window.addEventListener(EVENTO, avisar);
  window.addEventListener("storage", avisar);
  return () => {
    window.removeEventListener(EVENTO, avisar);
    window.removeEventListener("storage", avisar);
  };
}

function leerTema(): Tema {
  try {
    return localStorage.getItem(CLAVE) === "claro" ? "claro" : "oscuro";
  } catch {
    return "oscuro";
  }
}

function temaDelServidor(): Tema {
  return "oscuro";
}

export function useTema() {
  const tema = useSyncExternalStore(suscribir, leerTema, temaDelServidor);

  useEffect(() => {
    document.documentElement.dataset.theme = tema === "claro" ? "light" : "dark";
  }, [tema]);

  const alternar = useCallback(() => {
    try {
      localStorage.setItem(CLAVE, tema === "claro" ? "oscuro" : "claro");
    } catch {}
    window.dispatchEvent(new Event(EVENTO));
  }, [tema]);

  return { tema, alternar };
}
