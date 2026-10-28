import { redirect } from "next/navigation";
import { PanelCuenta } from "@/components/cuenta/PanelCuenta";
import { obtenerCuenta } from "@/lib/db";
import { obtenerSesion } from "@/lib/sesion";

export default async function CuentaPage() {
  const sesion = await obtenerSesion();
  if (!sesion) redirect("/login");

  const cuenta = await obtenerCuenta(sesion.userId);
  if (!cuenta) redirect("/login");

  return (
    <PanelCuenta
      login={cuenta.login}
      creadaEn={cuenta.createdAt.toISOString()}
      ultimoAcceso={cuenta.lastLoginAt.toISOString()}
      vault={
        cuenta.vault
          ? {
              repositorio: `${cuenta.vault.repoOwner}/${cuenta.vault.repoName}`,
              rama: cuenta.vault.branch,
              subcarpeta: cuenta.vault.basePath,
            }
          : null
      }
      conexiones={cuenta.grants.map((grant) => ({
        id: grant.id,
        cliente: grant.client.nombre,
        escritura: grant.scopes.includes("write"),
      }))}
    />
  );
}
