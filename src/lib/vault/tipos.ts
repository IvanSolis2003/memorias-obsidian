export type RepositorioDisponible = {
  installationId: number;
  owner: string;
  name: string;
  defaultBranch: string;
  privado: boolean;
};

export type SolicitudVault = {
  installationId: number;
  owner: string;
  repo: string;
  branch: string;
  basePath: string | null;
};

export type ResumenVault = {
  notas: number;
  adjuntos: number;
  tieneObsidian: boolean;
  truncado: boolean;
};

export type ArchivoVault = {
  ruta: string;
  sha: string;
  tamano: number;
};

export type EnlaceNota = {
  destino: string;
  seccion?: string;
  alias?: string;
  embed: boolean;
};

export type TituloNota = {
  nivel: number;
  texto: string;
};

export type NotaGuardada = {
  clave: string;
  ruta: string;
  sha: string;
  tamano: number;
  titulo: string;
  propiedades: Record<string, unknown>;
  tags: string[];
  enlaces: EnlaceNota[];
  titulos: TituloNota[];
};

export type MetaVault = {
  clave: string;
  commitSha: string;
  etag: string | null;
  archivos: ArchivoVault[];
  truncado: boolean;
  ultimaActualizacion: string;
};

export type VaultGuardado = {
  repoOwner: string;
  repoName: string;
  branch: string;
  basePath: string | null;
  updatedAt: string;
};
