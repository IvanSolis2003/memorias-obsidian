import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { PanelConexiones } from "@/components/conexiones/PanelConexiones";
import { obtenerVault } from "@/lib/db";
import { requerirVariable } from "@/lib/env";
import { obtenerSesion } from "@/lib/sesion";

export default async function ConexionesPage() {
  const sesion = await obtenerSesion();
  if (!sesion) redirect("/login");

  const vault = await obtenerVault(sesion.userId);
  const cabeceras = await headers();
  const host = cabeceras.get("x-forwarded-host") ?? cabeceras.get("host");
  const protocolo = cabeceras.get("x-forwarded-proto") ?? "https";

  return (
    <PanelConexiones
      slug={requerirVariable("GITHUB_APP_SLUG")}
      urlConector={`${protocolo}://${host}/api/mcp`}
      vaultInicial={
        vault
          ? {
              repoOwner: vault.repoOwner,
              repoName: vault.repoName,
              branch: vault.branch,
              basePath: vault.basePath,
              updatedAt: vault.updatedAt.toISOString(),
            }
          : null
      }
    />
  );
}
