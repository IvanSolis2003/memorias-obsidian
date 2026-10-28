"use client";

import { useEffect, useState } from "react";
import type {
  RepositorioDisponible,
  ResumenVault,
  SolicitudVault,
  VaultGuardado,
} from "@/lib/vault/tipos";
import { enviarJson, mensajeDeError, pedirJson } from "./api";
import { FilaAjuste, SeccionAjustes } from "./FilaAjuste";
import styles from "./Conexiones.module.css";

type AsistenteVaultProps = {
  slug: string;
  onGuardado: (vault: VaultGuardado) => void;
  onCancelar?: () => void;
};

export function AsistenteVault({ slug, onGuardado, onCancelar }: AsistenteVaultProps) {
  const [repositorios, setRepositorios] = useState<RepositorioDisponible[] | null>(null);
  const [errorRepositorios, setErrorRepositorios] = useState<string | null>(null);
  const [indice, setIndice] = useState("");
  const [branch, setBranch] = useState("");
  const [basePath, setBasePath] = useState("");
  const [resumen, setResumen] = useState<ResumenVault | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);

  const [busqueda, setBusqueda] = useState(0);

  useEffect(() => {
    let activo = true;
    pedirJson<{ repositorios: RepositorioDisponible[] }>("/api/vault/repos")
      .then((datos) => {
        if (!activo) return;
        setRepositorios(datos.repositorios);
        setErrorRepositorios(null);
      })
      .catch((e) => {
        if (activo) setErrorRepositorios(mensajeDeError(e));
      });
    return () => {
      activo = false;
    };
  }, [busqueda]);

  const repositorio = indice === "" ? null : (repositorios?.[Number(indice)] ?? null);
  const urlInstalacion = `https://github.com/apps/${slug}/installations/new`;

  function elegirRepositorio(valor: string) {
    setIndice(valor);
    setBranch(valor === "" ? "" : (repositorios?.[Number(valor)]?.defaultBranch ?? ""));
    setResumen(null);
    setError(null);
  }

  function cambiarCampo(poner: (valor: string) => void, valor: string) {
    poner(valor);
    setResumen(null);
    setError(null);
  }

  function solicitud(): SolicitudVault | null {
    if (!repositorio) return null;
    return {
      installationId: repositorio.installationId,
      owner: repositorio.owner,
      repo: repositorio.name,
      branch: branch.trim(),
      basePath: basePath.trim() || null,
    };
  }

  async function probar() {
    const datos = solicitud();
    if (!datos) return;
    setOcupado(true);
    setError(null);
    setResumen(null);
    try {
      const respuesta = await pedirJson<{ resumen: ResumenVault }>(
        "/api/vault/test",
        enviarJson("POST", datos),
      );
      setResumen(respuesta.resumen);
    } catch (e) {
      setError(mensajeDeError(e));
    } finally {
      setOcupado(false);
    }
  }

  async function guardar() {
    const datos = solicitud();
    if (!datos) return;
    setOcupado(true);
    setError(null);
    try {
      const respuesta = await pedirJson<{ vault: VaultGuardado }>(
        "/api/vault/config",
        enviarJson("PUT", datos),
      );
      onGuardado(respuesta.vault);
    } catch (e) {
      setError(mensajeDeError(e));
      setOcupado(false);
    }
  }

  const hayRepositorios = (repositorios?.length ?? 0) > 0;

  return (
    <>
      <SeccionAjustes titulo="1. Instalar la GitHub App">
        <FilaAjuste
          titulo={hayRepositorios ? "GitHub App instalada" : "Instala la App en tu repositorio"}
          descripcion={
            errorRepositorios ??
            (repositorios === null
              ? "Buscando tus repositorios…"
              : hayRepositorios
                ? "Para agregar más repositorios, vuelve a abrir la instalación."
                : "Elige solo el repositorio de tu vault. Al terminar, GitHub te devuelve aquí.")
          }
          apilada
        >
          <div className={styles.acciones}>
            <a className={styles.botonPrimario} href={urlInstalacion}>
              {hayRepositorios ? "Administrar instalación" : "Instalar en GitHub"}
            </a>
            <button type="button" className={styles.botonSecundario} onClick={() => setBusqueda((n) => n + 1)}>
              Buscar de nuevo
            </button>
          </div>
        </FilaAjuste>
      </SeccionAjustes>

      {hayRepositorios && (
        <>
          <SeccionAjustes titulo="2. Elegir repositorio">
            <FilaAjuste titulo="Repositorio" apilada>
              <select
                className={styles.campo}
                value={indice}
                onChange={(e) => elegirRepositorio(e.target.value)}
              >
                <option value="">Elige un repositorio</option>
                {repositorios?.map((repo, i) => (
                  <option key={`${repo.installationId}/${repo.owner}/${repo.name}`} value={i}>
                    {repo.owner}/{repo.name}
                    {repo.privado ? " (privado)" : ""}
                  </option>
                ))}
              </select>
            </FilaAjuste>
            <FilaAjuste titulo="Rama" descripcion="Por defecto, la rama principal del repositorio." apilada>
              <input
                className={styles.campo}
                value={branch}
                onChange={(e) => cambiarCampo(setBranch, e.target.value)}
                disabled={!repositorio}
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
              />
            </FilaAjuste>
            <FilaAjuste
              titulo="Subcarpeta base (opcional)"
              descripcion="Solo si tu vault está dentro de una carpeta del repositorio."
              apilada
            >
              <input
                className={styles.campo}
                value={basePath}
                onChange={(e) => cambiarCampo(setBasePath, e.target.value)}
                disabled={!repositorio}
                placeholder="Ej: notas"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
              />
            </FilaAjuste>
          </SeccionAjustes>

          <SeccionAjustes titulo="3. Probar la conexión">
            <FilaAjuste
              titulo="Probar conexión"
              descripcion={
                resumen
                  ? `Se encontraron ${resumen.notas} notas y ${resumen.adjuntos} adjuntos.`
                  : "Lee el repositorio y cuenta tus notas. El vault solo se guarda si la prueba pasa."
              }
              apilada
            >
              {resumen && !resumen.tieneObsidian && (
                <p className={styles.aviso}>
                  No hay carpeta .obsidian en esa ubicación: quizá no es un vault de Obsidian.
                </p>
              )}
              {resumen?.truncado && (
                <p className={styles.aviso}>
                  El repositorio es muy grande y GitHub entregó la lista incompleta.
                </p>
              )}
              {error && (
                <p className={styles.error} role="alert">
                  {error}
                </p>
              )}
              <div className={styles.acciones}>
                <button
                  type="button"
                  className={styles.botonSecundario}
                  onClick={probar}
                  disabled={!repositorio || !branch.trim() || ocupado}
                >
                  Probar conexión
                </button>
                <button
                  type="button"
                  className={styles.botonPrimario}
                  onClick={guardar}
                  disabled={!resumen || ocupado}
                >
                  Guardar vault
                </button>
              </div>
            </FilaAjuste>
          </SeccionAjustes>
        </>
      )}

      {onCancelar && (
        <div className={styles.acciones}>
          <button type="button" className={styles.botonSecundario} onClick={onCancelar}>
            Cancelar
          </button>
        </div>
      )}
    </>
  );
}
