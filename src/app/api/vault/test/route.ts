import { NextResponse, type NextRequest } from "next/server";
import { respuestaDeError } from "@/lib/errores";
import { requerirSesion } from "@/lib/sesion";
import { leerSolicitud, probarVault } from "@/lib/vault/conexion";

export async function POST(request: NextRequest) {
  try {
    const sesion = await requerirSesion();
    const solicitud = leerSolicitud(await request.json().catch(() => null));
    const { resumen } = await probarVault(sesion.accessToken, solicitud);
    return NextResponse.json({ resumen });
  } catch (error) {
    return respuestaDeError(error);
  }
}
