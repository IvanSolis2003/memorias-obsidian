import { spawn, spawnSync } from "node:child_process";
import { generateKeyPairSync, randomBytes } from "node:crypto";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { EncryptJWT } from "jose";
import { eliminarUsuario, guardarVault, registrarUsuario } from "../../../src/lib/db.ts";

const aqui = path.dirname(fileURLToPath(import.meta.url));
const raiz = path.resolve(aqui, "../../..");
const puerto = Number(process.env.PUERTO_PRUEBA ?? 3131);
const base = `http://localhost:${puerto}`;
const carpeta = mkdtempSync(path.join(tmpdir(), "memorias-mcp-"));
const registro = path.join(carpeta, "github.log");
writeFileSync(registro, "");

const { privateKey, publicKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
const enUnaLinea = (pem) => pem.replace(/\n/g, "\\n");

async function cookieDe(userId, githubId, login, accessToken) {
  const clave = new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(process.env.AUTH_SECRET)));
  const ahora = Date.now();
  return new EncryptJWT({
    userId,
    githubId,
    login,
    accessToken,
    accessTokenExpiraEn: ahora + 3600000,
    refreshToken: "r",
    refreshTokenExpiraEn: ahora + 86400000,
  })
    .setProtectedHeader({ alg: "dir", enc: "A256GCM" })
    .setIssuedAt()
    .setExpirationTime("1h")
    .encrypt(clave);
}

async function esperarServidor() {
  for (let intento = 0; intento < 60; intento++) {
    try {
      await fetch(`${base}/login`);
      return true;
    } catch {
      await new Promise((resolver) => setTimeout(resolver, 500));
    }
  }
  return false;
}

function detener(proceso) {
  if (!proceso || proceso.exitCode !== null) return;
  if (process.platform === "win32") {
    spawnSync("taskkill", ["/pid", String(proceso.pid), "/T", "/F"], { stdio: "ignore" });
  } else {
    proceso.kill();
  }
}

let servidor = null;
const ids = [];
let codigo = 1;

try {
  if (!process.env.AUTH_SECRET || !process.env.DATABASE_URL) {
    throw new Error("Faltan AUTH_SECRET y DATABASE_URL. Ejecuta con npm run test:mcp (usa .env.local).");
  }
  const usuarioA = await registrarUsuario({ githubId: 2100000031, login: "prueba-seg-a", nombre: null, avatarUrl: null });
  const usuarioB = await registrarUsuario({ githubId: 2100000032, login: "prueba-seg-b", nombre: null, avatarUrl: null });
  ids.push(usuarioA.id, usuarioB.id);
  await guardarVault(usuarioA.id, { installationId: 101, repoOwner: "userA", repoName: "vault-a", branch: "main", basePath: null });
  await guardarVault(usuarioB.id, { installationId: 202, repoOwner: "userB", repoName: "vault-b", branch: "main", basePath: null });
  const cookieA = await cookieDe(usuarioA.id, 2100000031, "prueba-seg-a", "token-A");
  const cookieB = await cookieDe(usuarioB.id, 2100000032, "prueba-seg-b", "token-B");
  const cookieIntruso = await cookieDe("intruso-id", 2100000033, "intruso", "token-X");

  const entorno = {
    ...process.env,
    FAKE_GH_LOG: registro,
    GITHUB_APP_ID: "12345",
    GITHUB_APP_PRIVATE_KEY: enUnaLinea(privateKey.export({ type: "pkcs1", format: "pem" })),
    FAKE_APP_PUBLIC_KEY: enUnaLinea(publicKey.export({ type: "spki", format: "pem" })),
    MCP_SIGNING_SECRET: randomBytes(32).toString("base64url"),
    ALLOWED_GITHUB_USERS: "prueba-seg-a,prueba-seg-b",
    NODE_OPTIONS: `--import ${pathToFileURL(path.join(aqui, "github-falso.mjs")).href}`,
  };
  servidor = spawn(process.execPath, [path.join(raiz, "node_modules/next/dist/bin/next"), "start", "-p", String(puerto)], {
    cwd: raiz,
    env: entorno,
    stdio: "ignore",
  });
  if (!(await esperarServidor())) {
    throw new Error("El servidor no arrancó. Ejecuta npm run build antes de npm run test:mcp.");
  }

  const bateria = spawnSync(
    process.execPath,
    [path.join(aqui, "bateria.mjs"), base, cookieA, cookieB, cookieIntruso, registro, usuarioA.id],
    { cwd: raiz, stdio: "inherit" },
  );
  codigo = bateria.status ?? 1;
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
} finally {
  detener(servidor);
  for (const id of ids) await eliminarUsuario(id).catch(() => null);
  rmSync(carpeta, { recursive: true, force: true });
}

process.exit(codigo);
