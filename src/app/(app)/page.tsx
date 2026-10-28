import { redirect } from "next/navigation";
import { InicioVault } from "@/components/InicioVault";
import { obtenerVault } from "@/lib/db";
import { obtenerSesion } from "@/lib/sesion";

export default async function Home() {
  const sesion = await obtenerSesion();
  if (!sesion) redirect("/login");
  if (!(await obtenerVault(sesion.userId))) redirect("/conexiones");

  return <InicioVault />;
}
