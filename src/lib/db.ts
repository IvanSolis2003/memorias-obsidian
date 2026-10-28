import { PrismaNeon } from "@prisma/adapter-neon";
import {
  PrismaClient,
  type AccionAuditoria,
  type OrigenAuditoria,
} from "../generated/prisma/client.ts";
import { requerirVariable } from "./env.ts";

const globalParaPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function prisma() {
  if (!globalParaPrisma.prisma) {
    const connectionString = requerirVariable("DATABASE_URL");
    globalParaPrisma.prisma = new PrismaClient({ adapter: new PrismaNeon({ connectionString }) });
  }
  return globalParaPrisma.prisma;
}

export type PerfilGithub = {
  githubId: number;
  login: string;
  nombre: string | null;
  avatarUrl: string | null;
};

export type DatosVault = {
  installationId: number;
  repoOwner: string;
  repoName: string;
  branch: string;
  basePath: string | null;
};

export function registrarUsuario(perfil: PerfilGithub) {
  const { githubId, ...datos } = perfil;
  return prisma().user.upsert({
    where: { githubId },
    create: { githubId, ...datos },
    update: { ...datos, lastLoginAt: new Date() },
  });
}

export function eliminarUsuario(userId: string) {
  return prisma().user.deleteMany({ where: { id: userId } });
}

export function obtenerCuenta(userId: string) {
  return prisma().user.findUnique({
    where: { id: userId },
    include: {
      vault: true,
      grants: {
        where: { revokedAt: null },
        orderBy: { createdAt: "desc" },
        include: { client: { select: { nombre: true } } },
      },
    },
  });
}

export function obtenerVault(userId: string) {
  return prisma().vault.findFirst({ where: { userId } });
}

export function guardarVault(userId: string, datos: DatosVault) {
  return prisma().vault.upsert({
    where: { userId },
    create: { userId, ...datos },
    update: datos,
  });
}

export function marcarLecturaCorrecta(userId: string) {
  return prisma().vault.updateMany({ where: { userId }, data: { updatedAt: new Date() } });
}

export function eliminarVault(userId: string) {
  return prisma().vault.deleteMany({ where: { userId } });
}

export function listarGrants(userId: string) {
  return prisma().mcpGrant.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    include: { client: { select: { nombre: true } } },
  });
}

export function registrarClienteMcp(datos: { id: string; nombre: string; redirectUris: string[] }) {
  return prisma().mcpClient.create({ data: datos });
}

export function obtenerClienteMcp(id: string) {
  return prisma().mcpClient.findUnique({ where: { id } });
}

export function crearGrant(datos: {
  id: string;
  userId: string;
  clientId: string;
  scopes: string[];
  refreshTokenHash: string;
}) {
  return prisma().mcpGrant.create({ data: datos });
}

export function obtenerGrant(grantId: string) {
  return prisma().mcpGrant.findUnique({ where: { id: grantId } });
}

export function obtenerGrantPorRefresh(refreshTokenHash: string) {
  return prisma().mcpGrant.findUnique({ where: { refreshTokenHash } });
}

export async function rotarRefreshGrant(
  grantId: string,
  hashActual: string,
  hashNuevo: string,
) {
  const { count } = await prisma().mcpGrant.updateMany({
    where: { id: grantId, refreshTokenHash: hashActual, revokedAt: null },
    data: { refreshTokenHash: hashNuevo, lastUsedAt: new Date() },
  });
  return count > 0;
}

export function marcarUsoGrant(grantId: string) {
  return prisma().mcpGrant.updateMany({
    where: { id: grantId, revokedAt: null },
    data: { lastUsedAt: new Date() },
  });
}

export async function revocarGrant(userId: string, grantId: string) {
  const { count } = await prisma().mcpGrant.updateMany({
    where: { id: grantId, userId, revokedAt: null },
    data: { revokedAt: new Date() },
  });
  return count > 0;
}

export function registrarAuditoria(
  userId: string,
  origen: OrigenAuditoria,
  accion: AccionAuditoria,
  ruta?: string,
) {
  return prisma().auditLog.create({ data: { userId, origen, accion, ruta } });
}

export function listarAuditoria(userId: string, origen: OrigenAuditoria, limite: number) {
  return prisma().auditLog.findMany({
    where: { userId, origen },
    orderBy: { createdAt: "desc" },
    take: limite,
  });
}

export function contarAuditoria(
  userId: string,
  origen: OrigenAuditoria,
  acciones: AccionAuditoria[],
  desde: Date,
) {
  return prisma().auditLog.count({
    where: { userId, origen, accion: { in: acciones }, createdAt: { gte: desde } },
  });
}
