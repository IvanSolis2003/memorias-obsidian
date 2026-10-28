import { createPrivateKey } from "node:crypto";
import { SignJWT } from "jose";
import { requerirVariable } from "./env";
import { ErrorApi } from "./errores";
import { crearTokenDeInstalacion } from "./github";
import { githubAppConfigurada } from "./mcp/configuracion";

const MARGEN_MS = 2 * 60 * 1000;

const cache = new Map<string, { token: string; expiraEn: number }>();

async function jwtDeApp() {
  const pem = requerirVariable("GITHUB_APP_PRIVATE_KEY").replace(/\\n/g, "\n");
  const ahora = Math.floor(Date.now() / 1000);
  return new SignJWT({})
    .setProtectedHeader({ alg: "RS256" })
    .setIssuer(requerirVariable("GITHUB_APP_ID"))
    .setIssuedAt(ahora - 60)
    .setExpirationTime(ahora + 9 * 60)
    .sign(createPrivateKey(pem));
}

export async function tokenDeInstalacion(
  installationId: number,
  repo: string,
  escritura: boolean,
): Promise<string> {
  if (!githubAppConfigurada()) {
    throw new ErrorApi(503, "El servidor aún no tiene configurada la clave de la GitHub App del conector.");
  }
  const llave = `${installationId}|${repo}|${escritura ? "w" : "r"}`;
  const guardado = cache.get(llave);
  if (guardado && guardado.expiraEn - MARGEN_MS > Date.now()) return guardado.token;
  const nuevo = await crearTokenDeInstalacion(await jwtDeApp(), installationId, repo, escritura);
  cache.set(llave, nuevo);
  return nuevo.token;
}
