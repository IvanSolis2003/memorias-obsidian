const VERSION = "v1";
const ESTATICOS = `memorias-estaticos-${VERSION}`;
const PAGINAS = `memorias-paginas-${VERSION}`;
const ESPERA_RED_MS = 3500;
const PREFIJO_NOTAS = "/n/";
const MAX_PAGINAS = 120;
const MAX_ESTATICOS = 200;

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (evento) => {
  evento.waitUntil(
    (async () => {
      const nombres = await caches.keys();
      await Promise.all(
        nombres
          .filter((nombre) => nombre.startsWith("memorias-") && nombre !== ESTATICOS && nombre !== PAGINAS)
          .map((nombre) => caches.delete(nombre)),
      );
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("message", (evento) => {
  if (evento.data === "limpiar") {
    evento.waitUntil(
      caches.keys().then((nombres) =>
        Promise.all(nombres.filter((nombre) => nombre.startsWith("memorias-")).map((nombre) => caches.delete(nombre))),
      ),
    );
  }
});

function esperar(ms) {
  return new Promise((resolver) => setTimeout(resolver, ms));
}

function llaveDePagina(url, esFlight) {
  return new Request(`${url.origin}${url.pathname}${esFlight ? "?rsc" : ""}`);
}

async function recortar(cache, maximo) {
  const llaves = await cache.keys();
  await Promise.all(llaves.slice(0, Math.max(0, llaves.length - maximo)).map((llave) => cache.delete(llave)));
}

async function primeroEstatico(request) {
  const cache = await caches.open(ESTATICOS);
  const guardada = await cache.match(request);
  if (guardada) return guardada;
  const respuesta = await fetch(request);
  if (respuesta.ok) cache.put(request, respuesta.clone()).then(() => recortar(cache, MAX_ESTATICOS));
  return respuesta;
}

async function cualquieraDeNotas(cache, esFlight) {
  const llaves = await cache.keys();
  const sufijo = esFlight ? "?rsc" : "";
  const llave = llaves.find((candidata) => {
    const url = new URL(candidata.url);
    return url.pathname.startsWith(PREFIJO_NOTAS) && url.search === sufijo;
  });
  return llave ? cache.match(llave, { ignoreVary: true }) : undefined;
}

async function redPrimero(request, esFlight) {
  const cache = await caches.open(PAGINAS);
  const url = new URL(request.url);
  const llave = llaveDePagina(url, esFlight);
  const guardada = await cache.match(llave, { ignoreVary: true });

  const red = fetch(request).then((respuesta) => {
    if (respuesta.ok && !respuesta.redirected) {
      cache.put(llave, respuesta.clone()).then(() => recortar(cache, MAX_PAGINAS));
    }
    return respuesta;
  });

  if (guardada) {
    return Promise.race([red.catch(() => guardada), esperar(ESPERA_RED_MS).then(() => guardada)]);
  }

  try {
    return await red;
  } catch {
    const parecida = url.pathname.startsWith(PREFIJO_NOTAS)
      ? await cualquieraDeNotas(cache, esFlight)
      : undefined;
    if (parecida) return parecida;
    const inicio = esFlight ? undefined : await cache.match(llaveDePagina(new URL("/", url.origin), false), { ignoreVary: true });
    return inicio ?? new Response("Sin conexión", { status: 503, headers: { "Content-Type": "text/plain; charset=utf-8" } });
  }
}

self.addEventListener("fetch", (evento) => {
  const request = evento.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  const ruta = url.pathname;
  if (ruta.startsWith("/api/") || ruta === "/login") return;

  if (ruta.startsWith("/_next/static/") || ruta.startsWith("/icons/") || ruta === "/apple-touch-icon.png") {
    evento.respondWith(primeroEstatico(request));
    return;
  }

  if (request.mode === "navigate") {
    evento.respondWith(redPrimero(request, false));
    return;
  }

  if (request.headers.get("RSC") === "1" && !request.headers.get("Next-Router-Prefetch")) {
    evento.respondWith(redPrimero(request, true));
  }
});
