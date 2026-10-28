import { obtenerVault } from "../db";
import { ErrorApi } from "../errores";

export type VaultConfigurado = {
  owner: string;
  repo: string;
  branch: string;
  basePath: string | null;
};

export async function vaultDeLaSesion(userId: string): Promise<VaultConfigurado> {
  const vault = await obtenerVault(userId);
  if (!vault) {
    throw new ErrorApi(409, "Aún no conectas un vault. Ve a Conexiones para conectarlo.", {
      ir: "/conexiones",
    });
  }
  return {
    owner: vault.repoOwner,
    repo: vault.repoName,
    branch: vault.branch,
    basePath: vault.basePath,
  };
}

export function rutaEnRepositorio(vault: VaultConfigurado, ruta: string) {
  return vault.basePath ? `${vault.basePath}/${ruta}` : ruta;
}
