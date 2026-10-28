import { ErrorApi } from "../errores";
import { listarInstalaciones, listarRepositorios, obtenerArbol } from "../github";
import { normalizarBasePath, resumirArbol } from "./rutas";
import type { RepositorioDisponible, ResumenVault, SolicitudVault } from "./tipos";

const FORMATO_NOMBRE = /^[A-Za-z0-9_.-]+$/;
const FORMATO_RAMA = /^[A-Za-z0-9_./-]+$/;

function esNombreValido(valor: unknown): valor is string {
  return typeof valor === "string" && FORMATO_NOMBRE.test(valor) && valor !== "." && valor !== "..";
}

export async function repositoriosDelUsuario(
  accessToken: string,
): Promise<RepositorioDisponible[]> {
  const instalaciones = await listarInstalaciones(accessToken);
  const porInstalacion = await Promise.all(
    instalaciones.map(async ({ id }) => {
      const repositorios = await listarRepositorios(accessToken, id);
      return repositorios.map((repo) => ({
        installationId: id,
        owner: repo.owner.login,
        name: repo.name,
        defaultBranch: repo.default_branch,
        privado: repo.private,
      }));
    }),
  );
  return porInstalacion.flat();
}

export function leerSolicitud(cuerpo: unknown): SolicitudVault {
  const datos = (cuerpo ?? {}) as Record<string, unknown>;
  const { installationId, owner, repo, branch } = datos;
  if (
    typeof installationId !== "number" ||
    !Number.isInteger(installationId) ||
    !esNombreValido(owner) ||
    !esNombreValido(repo) ||
    typeof branch !== "string" ||
    !FORMATO_RAMA.test(branch) ||
    branch.includes("..")
  ) {
    throw new ErrorApi(400, "Los datos del vault no son válidos.");
  }
  return { installationId, owner, repo, branch, basePath: normalizarBasePath(datos.basePath) };
}

export async function probarVault(
  accessToken: string,
  solicitud: SolicitudVault,
): Promise<{ repositorio: RepositorioDisponible; resumen: ResumenVault }> {
  const repositorios = await repositoriosDelUsuario(accessToken);
  const repositorio = repositorios.find(
    (disponible) =>
      disponible.installationId === solicitud.installationId &&
      disponible.owner.toLowerCase() === solicitud.owner.toLowerCase() &&
      disponible.name.toLowerCase() === solicitud.repo.toLowerCase(),
  );
  if (!repositorio) {
    throw new ErrorApi(
      403,
      "Ese repositorio no está disponible para tu cuenta. Instala la App sobre él.",
    );
  }

  const arbol = await obtenerArbol(
    accessToken,
    repositorio.owner,
    repositorio.name,
    solicitud.branch,
  );
  if (
    solicitud.basePath &&
    !arbol.tree.some((nodo) => nodo.type === "tree" && nodo.path === solicitud.basePath)
  ) {
    throw new ErrorApi(404, "La subcarpeta no existe en el repositorio.");
  }

  return {
    repositorio,
    resumen: { ...resumirArbol(arbol.tree, solicitud.basePath), truncado: arbol.truncated },
  };
}
