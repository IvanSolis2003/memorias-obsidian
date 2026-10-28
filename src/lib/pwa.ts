export async function limpiarCachesPwa() {
  if (typeof caches === "undefined") return;
  const nombres = await caches.keys();
  await Promise.all(
    nombres.filter((nombre) => nombre.startsWith("memorias-")).map((nombre) => caches.delete(nombre)),
  );
}
