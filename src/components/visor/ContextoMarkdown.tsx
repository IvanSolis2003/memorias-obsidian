"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { Resolutor } from "@/lib/vault/links";

export type ValorContextoMarkdown = {
  clave: string;
  rutaActual: string;
  resolutor: Resolutor;
  tamanos: Map<string, number>;
  profundidad: number;
  visitadas: string[];
};

const Contexto = createContext<ValorContextoMarkdown | null>(null);

export function ProveedorMarkdown({
  valor,
  children,
}: {
  valor: ValorContextoMarkdown;
  children: ReactNode;
}) {
  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>;
}

export function useContextoMarkdown() {
  const valor = useContext(Contexto);
  if (!valor) throw new Error("Falta el contexto del visor de notas");
  return valor;
}
