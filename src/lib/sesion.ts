import { cookies } from "next/headers";
import { COOKIE_SESION, descifrarSesion, type Sesion } from "./auth";
import { ErrorApi } from "./errores";

export async function obtenerSesion(): Promise<Sesion | null> {
  const almacen = await cookies();
  return descifrarSesion(almacen.get(COOKIE_SESION)?.value);
}

export async function requerirSesion(): Promise<Sesion> {
  const sesion = await obtenerSesion();
  if (!sesion) throw new ErrorApi(401, "No autenticado");
  return sesion;
}
