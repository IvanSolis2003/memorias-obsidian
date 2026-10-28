import { NextResponse, type NextRequest } from "next/server";
import { listarAuditoria, listarGrants, registrarAuditoria, revocarGrant } from "@/lib/db";
import { ErrorApi, respuestaDeError } from "@/lib/errores";
import { requerirSesion } from "@/lib/sesion";

const MAX_ACTIVIDAD = 20;

export async function GET() {
  try {
    const sesion = await requerirSesion();
    const [grants, actividad] = await Promise.all([
      listarGrants(sesion.userId),
      listarAuditoria(sesion.userId, "claude", MAX_ACTIVIDAD),
    ]);
    return NextResponse.json({
      conexiones: grants
        .filter((grant) => !grant.revokedAt)
        .map((grant) => ({
          id: grant.id,
          cliente: grant.client.nombre,
          escritura: grant.scopes.includes("write"),
          creadoEn: grant.createdAt.toISOString(),
          ultimoUso: grant.lastUsedAt?.toISOString() ?? null,
        })),
      actividad: actividad.map((fila) => ({
        id: fila.id,
        accion: fila.accion,
        ruta: fila.ruta,
        fecha: fila.createdAt.toISOString(),
      })),
    });
  } catch (error) {
    return respuestaDeError(error);
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const sesion = await requerirSesion();
    const cuerpo = (await request.json().catch(() => null)) as { id?: unknown } | null;
    if (typeof cuerpo?.id !== "string") throw new ErrorApi(400, "La conexión no es válida.");
    if (!(await revocarGrant(sesion.userId, cuerpo.id))) {
      throw new ErrorApi(404, "No se encontró esa conexión.");
    }
    await registrarAuditoria(sesion.userId, "claude", "revocar").catch(() => null);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return respuestaDeError(error);
  }
}
