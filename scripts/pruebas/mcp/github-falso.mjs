import { appendFileSync } from "node:fs";
import { createHash, createPublicKey, verify } from "node:crypto";

const registro = process.env.FAKE_GH_LOG;
const clavePublica = createPublicKey(process.env.FAKE_APP_PUBLIC_KEY.replace(/\\n/g, "\n"));
const original = globalThis.fetch;
const json = (cuerpo, estado = 200, extra = {}) =>
  new Response(JSON.stringify(cuerpo), { status: estado, headers: { "Content-Type": "application/json", ...extra } });
const b64 = (texto) => Buffer.from(texto, "utf8").toString("base64");
const sha1 = (texto) => createHash("sha1").update(texto).digest("hex");

const REPOS = {
  "userA/vault-a": {
    instalacion: 101,
    token: "token-A",
    archivos: {
      "Nota A.md": "secreto de A [[Carpeta/Hija]]\n",
      "Carpeta/Hija.md": "hija de A con palabra rarisima\n",
      ".obsidian/app.json": "{\"clave\":\"oculta-A\"}",
      "Grande.md": "x".repeat(150 * 1024),
      "Windows.md": "uno\r\ndos\r\ntres\r\n",
    },
  },
  "userB/vault-b": {
    instalacion: 202,
    token: "token-B",
    archivos: {
      "Nota B.md": "secreto de B\n",
    },
  },
};

function repoDeInstalacion(id) {
  return Object.entries(REPOS).find(([, r]) => r.instalacion === id);
}

function jwtDeAppValido(jwt) {
  const partes = jwt.split(".");
  if (partes.length !== 3) return null;
  const cabecera = JSON.parse(Buffer.from(partes[0], "base64url").toString());
  const datos = JSON.parse(Buffer.from(partes[1], "base64url").toString());
  const firmaOk = cabecera.alg === "RS256" && verify("RSA-SHA256", Buffer.from(`${partes[0]}.${partes[1]}`), clavePublica, Buffer.from(partes[2], "base64url"));
  const ahora = Math.floor(Date.now() / 1000);
  if (!firmaOk || datos.iss !== "12345" || datos.exp <= ahora || datos.exp - datos.iat > 11 * 60) return null;
  return datos;
}

function accesoDeToken(token) {
  const usuario = Object.entries(REPOS).find(([, r]) => r.token === token);
  if (usuario) return { repo: usuario[0], escritura: true };
  const m = /^inst-(\d+)-([rw])-/.exec(token);
  if (!m) return null;
  const encontrado = repoDeInstalacion(Number(m[1]));
  return encontrado ? { repo: encontrado[0], escritura: m[2] === "w" } : null;
}

let contador = 0;

globalThis.fetch = async (entrada, init = {}) => {
  const url = new URL(typeof entrada === "string" ? entrada : (entrada.url ?? String(entrada)));
  if (url.hostname !== "api.github.com") return original(entrada, init);
  const cab = new Headers(init.headers);
  const token = (cab.get("authorization") ?? "").replace("Bearer ", "");
  const ruta = decodeURIComponent(url.pathname);
  const metodo = init.method ?? "GET";
  if (registro) appendFileSync(registro, `${metodo} ${token.slice(0, 22)} ${ruta}\n`);

  const tokenInstalacion = /^\/app\/installations\/(\d+)\/access_tokens$/.exec(ruta);
  if (tokenInstalacion && metodo === "POST") {
    if (!jwtDeAppValido(token)) return json({ message: "A JSON web token could not be decoded" }, 401);
    const id = Number(tokenInstalacion[1]);
    const encontrado = repoDeInstalacion(id);
    const cuerpo = JSON.parse(init.body);
    if (!encontrado) return json({ message: "Not Found" }, 404);
    if (cuerpo.repositories?.length !== 1 || cuerpo.repositories[0] !== encontrado[0].split("/")[1]) return json({ message: "repo" }, 422);
    const nivel = cuerpo.permissions?.contents === "write" ? "w" : "r";
    if (registro) appendFileSync(registro, `INSTALACION ${id} ${nivel} ${cuerpo.repositories.join(",")}\n`);
    return json({ token: `inst-${id}-${nivel}-${++contador}`, expires_at: new Date(Date.now() + 3600 * 1000).toISOString() }, 201);
  }

  const acceso = accesoDeToken(token);
  if (!acceso) return json({ message: "Bad credentials" }, 401);

  if (ruta === "/user/installations") {
    const propias = Object.values(REPOS).filter((r) => r.token === token).map((r) => ({ id: r.instalacion }));
    return json({ installations: propias });
  }
  const coincideRepos = /^\/user\/installations\/(\d+)\/repositories$/.exec(ruta);
  if (coincideRepos) {
    const lista = Object.entries(REPOS)
      .filter(([, r]) => r.token === token && r.instalacion === Number(coincideRepos[1]))
      .map(([nombre]) => ({ name: nombre.split("/")[1], owner: { login: nombre.split("/")[0] }, default_branch: "main", private: true }));
    return lista.length === 0 ? json({ message: "Not Found" }, 404) : json({ repositories: lista });
  }

  if (ruta === "/search/code") {
    const q = url.searchParams.get("q") ?? "";
    const m = /repo:(\S+)/.exec(q);
    if (!m || m[1] !== acceso.repo) return json({ items: [] });
    const palabras = q.replace(/repo:\S+|extension:\S+/g, "").toLowerCase().split(/\s+/).filter(Boolean);
    const items = Object.entries(REPOS[acceso.repo].archivos)
      .filter(([p, c]) => p.endsWith(".md") && palabras.every((w) => c.toLowerCase().includes(w)))
      .map(([p, c]) => ({ path: p, text_matches: [{ fragment: c.slice(0, 80) }] }));
    return json({ items });
  }

  const coincideRepo = /^\/repos\/([^/]+)\/([^/]+)\/(.*)$/.exec(ruta);
  if (!coincideRepo) return json({ message: "Not Found" }, 404);
  const nombre = `${coincideRepo[1]}/${coincideRepo[2]}`;
  if (nombre !== acceso.repo) return json({ message: "Not Found" }, 404);
  const repo = REPOS[nombre];
  const resto = coincideRepo[3];

  if (resto === "git/ref/heads/main") return json({ object: { sha: `commit-${nombre}` } }, 200, { ETag: `W/"ref-${nombre}"` });
  if (resto.startsWith("git/trees/")) {
    const nodos = Object.keys(repo.archivos).map((p) => ({ path: p, type: "blob", sha: sha1(repo.archivos[p]), size: repo.archivos[p].length }));
    const carpetas = new Set();
    for (const p of Object.keys(repo.archivos)) {
      const partes = p.split("/");
      for (let i = 1; i < partes.length; i++) carpetas.add(partes.slice(0, i).join("/"));
    }
    for (const c of carpetas) nodos.push({ path: c, type: "tree", sha: sha1(c) });
    return json({ sha: "tree", tree: nodos, truncated: false });
  }
  if (resto.startsWith("contents/")) {
    const archivo = resto.slice("contents/".length);
    if (metodo === "PUT") {
      if (!acceso.escritura) return json({ message: "Resource not accessible by integration" }, 403);
      const cuerpo = JSON.parse(init.body);
      const existente = repo.archivos[archivo];
      if (existente !== undefined && !cuerpo.sha) return json({ message: "Invalid request.\n\n\"sha\" wasn't supplied." }, 422);
      if (existente !== undefined && cuerpo.sha !== sha1(existente)) return json({ message: `${archivo} does not match` }, 409);
      repo.archivos[archivo] = Buffer.from(cuerpo.content, "base64").toString("utf8");
      if (registro) appendFileSync(registro, `ESCRITURA ${nombre} ${archivo} | ${cuerpo.message}\n`);
      return json({ content: { sha: sha1(repo.archivos[archivo]) }, commit: { sha: "c".repeat(40) } }, 201);
    }
    if (repo.archivos[archivo] === undefined) return json({ message: "Not Found" }, 404);
    const contenido = repo.archivos[archivo];
    return json({ sha: sha1(contenido), size: contenido.length, encoding: "base64", content: b64(contenido) });
  }
  return json({ message: "Not Found" }, 404);
};
