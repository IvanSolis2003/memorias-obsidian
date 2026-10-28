import { NextResponse, type NextRequest } from "next/server";
import { eliminarUsuario } from "@/lib/db";
import { COOKIE_SESION } from "@/lib/auth";
import { ErrorApi, respuestaDeError } from "@/lib/errores";
import { requerirSesion } from "@/lib/sesion";

export async function DELETE(request: NextRequest) {
  try {
    const sesion = await requerirSesion();
    const cuerpo = (await request.json().catch(() => null)) as { confirmar?: unknown } | null;
    if (
      typeof cuerpo?.confirmar !== "string" ||
      cuerpo.confirmar.trim().toLowerCase() !== sesion.login.toLowerCase()
    ) {
      throw new ErrorApi(400, "Escribe tu usuario de GitHub tal como aparece para confirmar.");
    }
    await eliminarUsuario(sesion.userId);
    const respuesta = NextResponse.json({ ok: true });
    respuesta.cookies.delete(COOKIE_SESION);
    return respuesta;
  } catch (error) {
    return respuestaDeError(error);
  }
}
