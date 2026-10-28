"use client";

import { createContext, useContext, type ReactNode } from "react";

type ValorVault = {
  clave: string | null;
  version: number;
};

const ContextoVault = createContext<ValorVault>({ clave: null, version: 0 });

export function ProveedorVault({
  clave,
  version,
  children,
}: {
  clave: string | null;
  version: number;
  children: ReactNode;
}) {
  return <ContextoVault.Provider value={{ clave, version }}>{children}</ContextoVault.Provider>;
}

export function useClaveVault() {
  return useContext(ContextoVault).clave;
}

export function useVersionDatos() {
  return useContext(ContextoVault).version;
}
