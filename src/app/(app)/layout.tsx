import { AppShell } from "@/components/AppShell";
import { obtenerVault } from "@/lib/db";
import { obtenerSesion } from "@/lib/sesion";
import { claveDeVault } from "@/lib/vault/clave";

export default async function AppLayout({ children }: LayoutProps<"/">) {
  const sesion = await obtenerSesion();
  const vault = sesion ? await obtenerVault(sesion.userId) : null;
  const claveVault = sesion && vault ? claveDeVault(sesion.userId, vault) : null;

  return <AppShell claveVault={claveVault}>{children}</AppShell>;
}
