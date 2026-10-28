import { openDB, type DBSchema, type IDBPDatabase } from "idb";
import type { EstadoPestanas } from "../pestanas";
import type { MetaVault, NotaGuardada } from "./tipos";

type Contenido = {
  clave: string;
  ruta: string;
  contenido: string;
};

export type Borrador = {
  clave: string;
  ruta: string;
  texto: string;
  shaBase: string | null;
  actualizado: string;
};

type PestanasGuardadas = EstadoPestanas & { clave: string };

interface EsquemaMemorias extends DBSchema {
  meta: { key: string; value: MetaVault };
  notas: { key: [string, string]; value: NotaGuardada; indexes: { porVault: string } };
  contenidos: { key: [string, string]; value: Contenido; indexes: { porVault: string } };
  borradores: { key: [string, string]; value: Borrador; indexes: { porVault: string } };
  pestanas: { key: string; value: PestanasGuardadas };
}

let conexion: Promise<IDBPDatabase<EsquemaMemorias>> | null = null;

function abrir() {
  conexion ??= openDB<EsquemaMemorias>("memorias-ivan", 3, {
    upgrade(db, versionAnterior) {
      if (versionAnterior < 1) {
        db.createObjectStore("meta", { keyPath: "clave" });
        db.createObjectStore("notas", { keyPath: ["clave", "ruta"] }).createIndex("porVault", "clave");
        db.createObjectStore("contenidos", { keyPath: ["clave", "ruta"] }).createIndex(
          "porVault",
          "clave",
        );
      }
      if (versionAnterior < 2) {
        db.createObjectStore("borradores", { keyPath: ["clave", "ruta"] }).createIndex(
          "porVault",
          "clave",
        );
      }
      if (versionAnterior < 3) {
        db.createObjectStore("pestanas", { keyPath: "clave" });
      }
    },
  });
  return conexion;
}

export const abrirBase = abrir;

export async function leerMeta(clave: string) {
  return (await abrir()).get("meta", clave);
}

export async function guardarMeta(meta: MetaVault) {
  await (await abrir()).put("meta", meta);
}

export async function listarNotas(clave: string) {
  return (await abrir()).getAllFromIndex("notas", "porVault", clave);
}

export async function leerNota(clave: string, ruta: string) {
  return (await abrir()).get("notas", [clave, ruta]);
}

export async function leerContenido(clave: string, ruta: string) {
  return (await (await abrir()).get("contenidos", [clave, ruta]))?.contenido;
}

export async function listarContenidos(clave: string) {
  return (await abrir()).getAllFromIndex("contenidos", "porVault", clave);
}

export async function guardarNotas(items: { nota: NotaGuardada; contenido: string }[]) {
  const db = await abrir();
  const tx = db.transaction(["notas", "contenidos"], "readwrite");
  for (const { nota, contenido } of items) {
    tx.objectStore("notas").put(nota);
    tx.objectStore("contenidos").put({ clave: nota.clave, ruta: nota.ruta, contenido });
  }
  await tx.done;
}

export async function eliminarNotas(clave: string, rutas: string[]) {
  const db = await abrir();
  const tx = db.transaction(["notas", "contenidos"], "readwrite");
  for (const ruta of rutas) {
    tx.objectStore("notas").delete([clave, ruta]);
    tx.objectStore("contenidos").delete([clave, ruta]);
  }
  await tx.done;
}

export async function leerPestanas(clave: string) {
  return (await abrir()).get("pestanas", clave);
}

export async function guardarPestanas(clave: string, estado: EstadoPestanas) {
  await (await abrir()).put("pestanas", { clave, ...estado });
}

export async function purgarOtros(claveActual: string) {
  const db = await abrir();
  const tx = db.transaction(["meta", "notas", "contenidos", "borradores", "pestanas"], "readwrite");
  for (const nombre of ["meta", "notas", "contenidos", "borradores", "pestanas"] as const) {
    let cursor = await tx.objectStore(nombre).openCursor();
    while (cursor) {
      if (cursor.value.clave !== claveActual) await cursor.delete();
      cursor = await cursor.continue();
    }
  }
  await tx.done;
}

export async function limpiarAlmacenamiento() {
  const db = await abrir();
  const tx = db.transaction(["meta", "notas", "contenidos", "borradores", "pestanas"], "readwrite");
  await Promise.all([
    tx.objectStore("meta").clear(),
    tx.objectStore("notas").clear(),
    tx.objectStore("contenidos").clear(),
    tx.objectStore("borradores").clear(),
    tx.objectStore("pestanas").clear(),
  ]);
  await tx.done;
}
