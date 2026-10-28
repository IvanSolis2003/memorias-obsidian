import { NextResponse, type NextRequest } from "next/server";
import {
  eliminarVault,
  guardarVault,
  obtenerVault,
  registrarAuditoria,
} from "@/lib/db";
import { respuestaDeError } from "@/lib/errores";
import { requerirSesion } from "@/lib/sesion";
import { leerSolicitud, probarVault } from "@/lib/vault/conexion";
import type { VaultGuardado } from "@/lib/vault/tipos";

type FilaVault = {
  repoOwner: string;
  repoName: string;
  branch: string;
  basePath: string | null;
  updatedAt: Date;
};

function vaultPublico(vault: FilaVault): VaultGuardado {
  return {
    repoOwner: vault.repoOwner,
    repoName: vault.repoName,
    branch: vault.branch,
    basePath: vault.basePath,
    updatedAt: vault.updatedAt.toISOString(),
  };
}

export async function GET() {
  try {
    const sesion = await requerirSesion();
    const vault = await obtenerVault(sesion.userId);
    return NextResponse.json({ vault: vault ? vaultPublico(vault) : null });
  } catch (error) {
    return respuestaDeError(error);
  }
}

export async function PUT(request: NextRequest) {
  try {
    const sesion = await requerirSesion();
    const solicitud = leerSolicitud(await request.json().catch(() => null));
    const { repositorio } = await probarVault(sesion.accessToken, solicitud);
    const vault = await guardarVault(sesion.userId, {
      installationId: repositorio.installationId,
      repoOwner: repositorio.owner,
      repoName: repositorio.name,
      branch: solicitud.branch,
      basePath: solicitud.basePath,
    });
    await registrarAuditoria(
      sesion.userId,
      "app",
      "conectar",
      `${repositorio.owner}/${repositorio.name}`,
    );
    return NextResponse.json({ vault: vaultPublico(vault) });
  } catch (error) {
    return respuestaDeError(error);
  }
}

export async function DELETE() {
  try {
    const sesion = await requerirSesion();
    await eliminarVault(sesion.userId);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return respuestaDeError(error);
  }
}
