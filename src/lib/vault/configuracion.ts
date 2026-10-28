import { ErrorApi } from "../errores";
import { obtenerContenido } from "../github";
import type { VaultConfigurado } from "./acceso";

const VIGENCIA_MS = 10 * 60 * 1000;
const RUTA_CONFIGURACION = ".obsidian/app.json";

const cache = new Map<string, { vence: number; valor: string | null }>();

export async function carpetaDeAdjuntosConfigurada(
  accessToken: string,
  vault: VaultConfigurado,
): Promise<string | null> {
  const llave = `${vault.owner}/${vault.repo}@${vault.branch}:${vault.basePath ?? ""}`;
  const guardada = cache.get(llave);
  if (guardada && guardada.vence > Date.now()) return guardada.valor;

  let valor: string | null = null;
  try {
    const ruta = vault.basePath ? `${vault.basePath}/${RUTA_CONFIGURACION}` : RUTA_CONFIGURACION;
    const { contenido } = await obtenerContenido(
      accessToken,
      vault.owner,
      vault.repo,
      ruta,
      vault.branch,
    );
    const datos = JSON.parse(contenido) as { attachmentFolderPath?: unknown };
    valor = typeof datos.attachmentFolderPath === "string" ? datos.attachmentFolderPath : null;
  } catch (error) {
    if (error instanceof ErrorApi && [401, 403, 429].includes(error.estado)) throw error;
    valor = null;
  }
  cache.set(llave, { vence: Date.now() + VIGENCIA_MS, valor });
  return valor;
}
