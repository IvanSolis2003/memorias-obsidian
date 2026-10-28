"use client";

import Link from "next/link";
import { useState } from "react";
import { fechaLegible } from "@/lib/tiempo";
import { limpiarCachesPwa } from "@/lib/pwa";
import { limpiarAlmacenamiento } from "@/lib/vault/store";
import { mensajeDeError, pedirJson } from "../conexiones/api";
import { FilaAjuste, SeccionAjustes } from "../conexiones/FilaAjuste";
import styles from "../conexiones/Conexiones.module.css";

type PanelCuentaProps = {
  login: string;
  creadaEn: string;
  ultimoAcceso: string;
  vault: { repositorio: string; rama: string; subcarpeta: string | null } | null;
  conexiones: { id: string; cliente: string; escritura: boolean }[];
};

export function PanelCuenta({ login, creadaEn, ultimoAcceso, vault, conexiones }: PanelCuentaProps) {
  const [confirmacion, setConfirmacion] = useState("");
  const [eliminando, setEliminando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const coincide = confirmacion.trim().toLowerCase() === login.toLowerCase();

  async function eliminar() {
    if (!coincide || eliminando) return;
    setEliminando(true);
    setError(null);
    try {
      await pedirJson("/api/account", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirmar: confirmacion }),
      });
      await Promise.all([limpiarAlmacenamiento(), limpiarCachesPwa()]).catch(() => null);
      window.location.replace("/login");
    } catch (e) {
      setError(mensajeDeError(e));
      setEliminando(false);
    }
  }

  return (
    <div className={styles.pagina}>
      <SeccionAjustes titulo="Datos guardados">
        <FilaAjuste titulo="Cuenta de GitHub">
          <span className={styles.valor}>{login}</span>
        </FilaAjuste>
        <FilaAjuste titulo="Registrada">
          <span className={styles.valor} suppressHydrationWarning>
            {fechaLegible(creadaEn)}
          </span>
        </FilaAjuste>
        <FilaAjuste titulo="Último acceso">
          <span className={styles.valor} suppressHydrationWarning>
            {fechaLegible(ultimoAcceso)}
          </span>
        </FilaAjuste>
        <FilaAjuste
          titulo="Vault conectado"
          descripcion={
            vault
              ? `Rama ${vault.rama}${vault.subcarpeta ? ` · subcarpeta ${vault.subcarpeta}` : ""}`
              : "Todavía no conectas un vault."
          }
        >
          {vault && <span className={styles.valor}>{vault.repositorio}</span>}
        </FilaAjuste>
        <FilaAjuste
          titulo="Conexiones de Claude"
          descripcion={
            conexiones.length === 0
              ? "No hay ningún Claude conectado."
              : conexiones
                  .map((conexion) => `${conexion.cliente} (${conexion.escritura ? "lectura y escritura" : "solo lectura"})`)
                  .join(" · ")
          }
        >
          <Link className={styles.botonSecundario} href="/conexiones">
            Administrar
          </Link>
        </FilaAjuste>
        <FilaAjuste
          titulo="Privacidad"
          descripcion="Qué se guarda, dónde y cómo revocar el acceso."
        >
          <Link className={styles.botonSecundario} href="/privacidad">
            Leer
          </Link>
        </FilaAjuste>
      </SeccionAjustes>

      <SeccionAjustes titulo="Eliminar mi cuenta">
        <FilaAjuste
          titulo="Qué pasa al eliminarla"
          apilada
          descripcion={
            <ul className={styles.pasos}>
              <li>Se borran de la base de datos tu usuario, tu vault elegido, tus conexiones de Claude y tu actividad.</li>
              <li>Todas las conexiones de Claude dejan de funcionar de inmediato.</li>
              <li>Se vacía la copia local de tus notas en este dispositivo y se cierra la sesión.</li>
              <li>
                No se toca tu repositorio de GitHub ni se desinstala la GitHub App. Para quitarla, ve a{" "}
                <a href="https://github.com/settings/installations" target="_blank" rel="noreferrer">
                  la configuración de GitHub
                </a>
                .
              </li>
            </ul>
          }
        />
        <FilaAjuste titulo="Confirmación" descripcion={`Escribe ${login} para confirmar.`} apilada>
          <input
            className={styles.campo}
            value={confirmacion}
            onChange={(e) => setConfirmacion(e.target.value)}
            aria-label="Escribe tu usuario de GitHub para confirmar"
            autoCapitalize="none"
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
          />
          <button type="button" className={styles.botonPeligro} disabled={!coincide || eliminando} onClick={eliminar}>
            {eliminando ? "Eliminando…" : "Eliminar mi cuenta"}
          </button>
        </FilaAjuste>
        {error && (
          <p className={styles.error} role="alert">
            {error}
          </p>
        )}
      </SeccionAjustes>
    </div>
  );
}
