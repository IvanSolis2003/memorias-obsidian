"use client";

import { useState } from "react";
import type { VaultGuardado } from "@/lib/vault/tipos";
import { PanelClaude } from "./PanelClaude";
import { PanelObsidian } from "./PanelObsidian";
import styles from "./Conexiones.module.css";

type PanelConexionesProps = {
  slug: string;
  urlConector: string;
  vaultInicial: VaultGuardado | null;
};

export function PanelConexiones({ slug, urlConector, vaultInicial }: PanelConexionesProps) {
  const [pestana, setPestana] = useState<"obsidian" | "claude">("obsidian");

  return (
    <div className={styles.pagina}>
      <div className={styles.pestanas} role="tablist">
        {(["obsidian", "claude"] as const).map((id) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={pestana === id}
            className={`${styles.pestana} ${pestana === id ? styles.pestanaActiva : ""}`}
            onClick={() => setPestana(id)}
          >
            {id === "obsidian" ? "Obsidian" : "Claude"}
          </button>
        ))}
      </div>

      {pestana === "obsidian" ? (
        <PanelObsidian slug={slug} vaultInicial={vaultInicial} />
      ) : (
        <PanelClaude
          urlConector={urlConector}
          tieneVault={vaultInicial !== null}
          onIrAObsidian={() => setPestana("obsidian")}
        />
      )}
    </div>
  );
}
