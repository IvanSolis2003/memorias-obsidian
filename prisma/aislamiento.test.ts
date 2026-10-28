import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import {
  contarAuditoria,
  eliminarUsuario,
  eliminarVault,
  guardarVault,
  listarAuditoria,
  obtenerVault,
  registrarAuditoria,
  registrarUsuario,
} from "../src/lib/db.ts";

const ID_GITHUB_A = 2100000001;
const ID_GITHUB_B = 2100000002;

const vaultA = {
  installationId: 1,
  repoOwner: "usuario-a",
  repoName: "vault-a",
  branch: "main",
  basePath: null,
};

const vaultB = {
  installationId: 2,
  repoOwner: "usuario-b",
  repoName: "vault-b",
  branch: "main",
  basePath: "notas",
};

describe("aislamiento entre usuarios", () => {
  let idA = "";
  let idB = "";

  before(async () => {
    const a = await registrarUsuario({
      githubId: ID_GITHUB_A,
      login: "prueba-a",
      nombre: null,
      avatarUrl: null,
    });
    const b = await registrarUsuario({
      githubId: ID_GITHUB_B,
      login: "prueba-b",
      nombre: null,
      avatarUrl: null,
    });
    idA = a.id;
    idB = b.id;
    await guardarVault(idA, vaultA);
    await registrarAuditoria(idA, "app", "guardar", "nota-de-a.md");
  });

  after(async () => {
    await eliminarUsuario(idA);
    await eliminarUsuario(idB);
  });

  it("registrar dos veces al mismo usuario conserva su id y actualiza el acceso", async () => {
    const usuario = await registrarUsuario({
      githubId: ID_GITHUB_A,
      login: "prueba-a-renombrado",
      nombre: "A",
      avatarUrl: null,
    });
    assert.equal(usuario.id, idA);
    assert.equal(usuario.login, "prueba-a-renombrado");
  });

  it("el usuario B no puede leer el vault del usuario A", async () => {
    assert.equal(await obtenerVault(idB), null);
    const propioA = await obtenerVault(idA);
    assert.equal(propioA?.repoName, "vault-a");
  });

  it("guardar el vault de B no modifica el de A", async () => {
    await guardarVault(idB, vaultB);
    const a = await obtenerVault(idA);
    const b = await obtenerVault(idB);
    assert.equal(a?.repoName, "vault-a");
    assert.equal(a?.basePath, null);
    assert.equal(b?.repoName, "vault-b");
    assert.equal(b?.basePath, "notas");
  });

  it("la auditoría de A no aparece para B", async () => {
    const desde = new Date(Date.now() - 60_000);
    assert.equal((await listarAuditoria(idB, "app", 10)).length, 0);
    assert.equal(await contarAuditoria(idB, "app", ["guardar"], desde), 0);
    assert.equal(await contarAuditoria(idA, "app", ["guardar"], desde), 1);
  });

  it("eliminar el vault de B no toca el de A", async () => {
    const { count } = await eliminarVault(idB);
    assert.equal(count, 1);
    assert.equal((await obtenerVault(idA))?.repoName, "vault-a");
    assert.equal(await obtenerVault(idB), null);
  });

  it("eliminar un usuario borra en cascada su vault y su auditoría", async () => {
    await eliminarUsuario(idA);
    assert.equal(await obtenerVault(idA), null);
    assert.equal((await listarAuditoria(idA, "app", 10)).length, 0);
  });
});
