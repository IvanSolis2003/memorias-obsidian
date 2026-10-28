"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { fechaLegible } from "@/lib/tiempo";
import { limpiarAlmacenamiento } from "@/lib/vault/store";
import type { VaultGuardado } from "@/lib/vault/tipos";
import { mensajeDeError, pedirJson } from "./api";
import { AsistenteVault } from "./AsistenteVault";
import { FilaAjuste, SeccionAjustes } from "./FilaAjuste";
import { GuiaComputador } from "./GuiaComputador";
import styles from "./Conexiones.module.css";

type PanelObsidianProps = {
  slug: string;
  vaultInicial: VaultGuardado | null;
};

export function PanelObsidian({ slug, vaultInicial }: PanelObsidianProps) {
  const router = useRouter();
  const [vault, setVault] = useState(vaultInicial);
  const [cambiando, setCambiando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function desconectar() {
    if (!window.confirm("¿Desconectar tu vault? Tus notas en GitHub no se tocan.")) return;
    try {
      await pedirJson("/api/vault/config", { method: "DELETE" });
      await limpiarAlmacenamiento().catch(() => null);
      setVault(null);
      setCambiando(false);
      router.refresh();
    } catch (e) {
      setError(mensajeDeError(e));
    }
  }

  if (!vault || cambiando) {
    return (
      <AsistenteVault
        slug={slug}
        onGuardado={async (nuevo) => {
          await limpiarAlmacenamiento().catch(() => null);
          setVault(nuevo);
          setCambiando(false);
          router.refresh();
        }}
        onCancelar={vault ? () => setCambiando(false) : undefined}
      />
    );
  }

  return (
    <>
      <SeccionAjustes titulo="Vault conectado">
        <FilaAjuste titulo="Repositorio">
          <span className={styles.valor}>
            {vault.repoOwner}/{vault.repoName}
          </span>
        </FilaAjuste>
        <FilaAjuste titulo="Rama">
          <span className={styles.valor}>{vault.branch}</span>
        </FilaAjuste>
        {vault.basePath && (
          <FilaAjuste titulo="Subcarpeta base">
            <span className={styles.valor}>{vault.basePath}</span>
          </FilaAjuste>
        )}
        <FilaAjuste titulo="Última lectura correcta">
          <span className={styles.valor} suppressHydrationWarning>
            {fechaLegible(vault.updatedAt)}
          </span>
        </FilaAjuste>
        <FilaAjuste titulo="Cambiar de vault" descripcion="Elige otro repositorio, rama o subcarpeta.">
          <button type="button" className={styles.botonSecundario} onClick={() => setCambiando(true)}>
            Cambiar
          </button>
        </FilaAjuste>
        <FilaAjuste titulo="Desconectar" descripcion="Quita el vault de tu cuenta. No borra nada en GitHub.">
          <button type="button" className={styles.botonPeligro} onClick={desconectar}>
            Desconectar
          </button>
        </FilaAjuste>
        {error && (
          <p className={styles.error} role="alert">
            {error}
          </p>
        )}
      </SeccionAjustes>
      <GuiaComputador vault={vault} />
    </>
  );
}
