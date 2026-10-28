"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { Edicion } from "./useEdicion";

const Contexto = createContext<Edicion | null>(null);

export function ProveedorEdicion({ valor, children }: { valor: Edicion; children: ReactNode }) {
  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>;
}

export function useContextoEdicion() {
  const valor = useContext(Contexto);
  if (!valor) throw new Error("Falta el contexto de edición");
  return valor;
}
