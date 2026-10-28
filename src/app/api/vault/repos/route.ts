import { NextResponse } from "next/server";
import { respuestaDeError } from "@/lib/errores";
import { requerirSesion } from "@/lib/sesion";
import { repositoriosDelUsuario } from "@/lib/vault/conexion";

export async function GET() {
  try {
    const sesion = await requerirSesion();
    const repositorios = await repositoriosDelUsuario(sesion.accessToken);
    return NextResponse.json({ repositorios });
  } catch (error) {
    return respuestaDeError(error);
  }
}
