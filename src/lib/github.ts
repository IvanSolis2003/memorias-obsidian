import { ErrorApi } from "./errores";

const API_GITHUB = "https://api.github.com";
const REPOS_POR_PAGINA = 100;
const PAGINAS_MAXIMAS = 10;

export type UsuarioGithub = {
  id: number;
  login: string;
  name: string | null;
  avatar_url: string;
};

type InstalacionGithub = {
  id: number;
};

type RepositorioGithub = {
  name: string;
  owner: { login: string };
  default_branch: string;
  private: boolean;
};

export type NodoArbol = {
  path: string;
  type: "blob" | "tree" | "commit";
  sha: string;
  size?: number;
};

export type ArbolGithub = {
  sha: string;
  tree: NodoArbol[];
  truncated: boolean;
};

type RespuestaCondicional<T> =
  | { cambiado: false }
  | { cambiado: true; datos: T; etag: string | null };

type ContenidoGithub = {
  sha: string;
  size: number;
  encoding: string;
  content: string;
};

const MAX_ARCHIVO_BYTES = 25 * 1024 * 1024;

function mensajeDeError(respuesta: Response) {
  const { status, headers } = respuesta;
  if (status === 401) return "Tu sesión de GitHub ya no es válida. Vuelve a iniciar sesión.";
  if ((status === 403 || status === 429) && headers.get("x-ratelimit-remaining") === "0") {
    return "GitHub limitó las peticiones. Intenta de nuevo en unos minutos.";
  }
  if (status === 403) return "GitHub no permitió el acceso. Revisa los permisos de la App.";
  if (status === 404) return "GitHub no encontró el repositorio o la rama.";
  if (status === 409) return "El repositorio está vacío.";
  return `GitHub respondió con el error ${status}.`;
}

function cabeceras(accessToken: string, extra: Record<string, string> = {}) {
  return {
    Authorization: `Bearer ${accessToken}`,
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    ...extra,
  };
}

function enUrl(ruta: string) {
  return ruta.split("/").map(encodeURIComponent).join("/");
}

async function pedir<T>(accessToken: string, ruta: string): Promise<T> {
  const respuesta = await fetch(`${API_GITHUB}${ruta}`, {
    headers: cabeceras(accessToken),
    cache: "no-store",
  });
  if (!respuesta.ok) throw new ErrorApi(respuesta.status, mensajeDeError(respuesta));
  return respuesta.json();
}

async function pedirCondicional<T>(
  accessToken: string,
  ruta: string,
  etag: string | null,
): Promise<RespuestaCondicional<T>> {
  const respuesta = await fetch(`${API_GITHUB}${ruta}`, {
    headers: cabeceras(accessToken, etag ? { "If-None-Match": etag } : {}),
    cache: "no-store",
  });
  if (respuesta.status === 304) return { cambiado: false };
  if (!respuesta.ok) throw new ErrorApi(respuesta.status, mensajeDeError(respuesta));
  return { cambiado: true, datos: await respuesta.json(), etag: respuesta.headers.get("etag") };
}

export function obtenerUsuarioGithub(accessToken: string) {
  return pedir<UsuarioGithub>(accessToken, "/user");
}

export async function listarInstalaciones(accessToken: string) {
  const datos = await pedir<{ installations: InstalacionGithub[] }>(
    accessToken,
    `/user/installations?per_page=${REPOS_POR_PAGINA}`,
  );
  return datos.installations;
}

export async function listarRepositorios(accessToken: string, installationId: number) {
  const repositorios: RepositorioGithub[] = [];
  for (let pagina = 1; pagina <= PAGINAS_MAXIMAS; pagina++) {
    const datos = await pedir<{ repositories: RepositorioGithub[] }>(
      accessToken,
      `/user/installations/${installationId}/repositories?per_page=${REPOS_POR_PAGINA}&page=${pagina}`,
    );
    repositorios.push(...datos.repositories);
    if (datos.repositories.length < REPOS_POR_PAGINA) break;
  }
  return repositorios;
}

export function obtenerArbol(accessToken: string, owner: string, repo: string, branch: string) {
  return pedir<ArbolGithub>(
    accessToken,
    `/repos/${owner}/${repo}/git/trees/${encodeURIComponent(branch)}?recursive=1`,
  );
}

export function obtenerRama(
  accessToken: string,
  owner: string,
  repo: string,
  branch: string,
  etag: string | null,
) {
  return pedirCondicional<{ object: { sha: string } }>(
    accessToken,
    `/repos/${owner}/${repo}/git/ref/heads/${enUrl(branch)}`,
    etag,
  );
}

export async function obtenerContenido(
  accessToken: string,
  owner: string,
  repo: string,
  ruta: string,
  branch: string,
) {
  const archivo = await pedir<ContenidoGithub>(
    accessToken,
    `/repos/${owner}/${repo}/contents/${enUrl(ruta)}?ref=${encodeURIComponent(branch)}`,
  );
  if (archivo.encoding === "base64") {
    return { sha: archivo.sha, contenido: Buffer.from(archivo.content, "base64").toString("utf8") };
  }
  const blob = await pedir<ContenidoGithub>(
    accessToken,
    `/repos/${owner}/${repo}/git/blobs/${archivo.sha}`,
  );
  return { sha: archivo.sha, contenido: Buffer.from(blob.content, "base64").toString("utf8") };
}

export async function descargarArchivo(
  accessToken: string,
  owner: string,
  repo: string,
  ruta: string,
  branch: string,
) {
  const respuesta = await fetch(
    `${API_GITHUB}/repos/${owner}/${repo}/contents/${enUrl(ruta)}?ref=${encodeURIComponent(branch)}`,
    {
      headers: cabeceras(accessToken, { Accept: "application/vnd.github.raw+json" }),
      cache: "no-store",
    },
  );
  if (!respuesta.ok) throw new ErrorApi(respuesta.status, mensajeDeError(respuesta));
  const declarado = Number(respuesta.headers.get("content-length") ?? 0);
  if (declarado > MAX_ARCHIVO_BYTES) {
    throw new ErrorApi(413, "El archivo es demasiado grande para mostrarlo.");
  }
  const bytes = new Uint8Array(await respuesta.arrayBuffer());
  if (bytes.byteLength > MAX_ARCHIVO_BYTES) {
    throw new ErrorApi(413, "El archivo es demasiado grande para mostrarlo.");
  }
  return bytes;
}

type DatosGuardado = {
  ruta: string;
  contenido: string | Uint8Array;
  mensaje: string;
  branch: string;
  sha: string | null;
};

export async function guardarArchivo(
  accessToken: string,
  owner: string,
  repo: string,
  datos: DatosGuardado,
) {
  const respuesta = await fetch(`${API_GITHUB}/repos/${owner}/${repo}/contents/${enUrl(datos.ruta)}`, {
    method: "PUT",
    headers: { ...cabeceras(accessToken), "Content-Type": "application/json" },
    body: JSON.stringify({
      message: datos.mensaje,
      content:
        typeof datos.contenido === "string"
          ? Buffer.from(datos.contenido, "utf8").toString("base64")
          : Buffer.from(datos.contenido).toString("base64"),
      branch: datos.branch,
      ...(datos.sha ? { sha: datos.sha } : {}),
    }),
    cache: "no-store",
  });

  if (!respuesta.ok) {
    const cuerpo = await respuesta.clone().json().catch(() => null);
    const mensaje = String(cuerpo?.message ?? "");
    if (respuesta.status === 409 || (respuesta.status === 422 && /sha/i.test(mensaje))) {
      throw new ErrorApi(409, "La nota cambió en GitHub desde la última vez que la descargaste.", {
        codigo: "conflicto",
      });
    }
    throw new ErrorApi(respuesta.status, mensajeDeError(respuesta));
  }
  const resultado: { content: { sha: string }; commit: { sha: string } } = await respuesta.json();
  return { sha: resultado.content.sha, commitSha: resultado.commit.sha };
}

export async function crearTokenDeInstalacion(
  jwtDeApp: string,
  installationId: number,
  repo: string,
  escritura: boolean,
) {
  const respuesta = await fetch(`${API_GITHUB}/app/installations/${installationId}/access_tokens`, {
    method: "POST",
    headers: { ...cabeceras(jwtDeApp), "Content-Type": "application/json" },
    body: JSON.stringify({
      repositories: [repo],
      permissions: { contents: escritura ? "write" : "read" },
    }),
    cache: "no-store",
  });
  if (!respuesta.ok) {
    throw new ErrorApi(
      respuesta.status === 404 ? 404 : 502,
      "No se pudo obtener acceso al repositorio con la GitHub App. Revisa la instalación en Conexiones.",
    );
  }
  const datos: { token: string; expires_at: string } = await respuesta.json();
  return { token: datos.token, expiraEn: Date.parse(datos.expires_at) };
}

type CoincidenciaBusqueda = { path: string; text_matches?: { fragment: string }[] };

export async function buscarCodigo(
  accessToken: string,
  owner: string,
  repo: string,
  consulta: string,
) {
  const q = `${consulta} repo:${owner}/${repo} extension:md`;
  const respuesta = await fetch(`${API_GITHUB}/search/code?q=${encodeURIComponent(q)}&per_page=30`, {
    headers: cabeceras(accessToken, { Accept: "application/vnd.github.text-match+json" }),
    cache: "no-store",
  });
  if (!respuesta.ok) throw new ErrorApi(respuesta.status, mensajeDeError(respuesta));
  const datos: { items: CoincidenciaBusqueda[] } = await respuesta.json();
  return datos.items;
}
