export type TipoArchivo = {
  mime: string;
  enLinea: boolean;
};

const TIPOS: Record<string, TipoArchivo> = {
  png: { mime: "image/png", enLinea: true },
  jpg: { mime: "image/jpeg", enLinea: true },
  jpeg: { mime: "image/jpeg", enLinea: true },
  gif: { mime: "image/gif", enLinea: true },
  webp: { mime: "image/webp", enLinea: true },
  svg: { mime: "image/svg+xml", enLinea: true },
  pdf: { mime: "application/pdf", enLinea: true },
  mp3: { mime: "audio/mpeg", enLinea: true },
  m4a: { mime: "audio/mp4", enLinea: true },
  wav: { mime: "audio/wav", enLinea: true },
  docx: {
    mime: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    enLinea: false,
  },
  xlsx: {
    mime: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    enLinea: false,
  },
  pptx: {
    mime: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    enLinea: false,
  },
  txt: { mime: "text/plain; charset=utf-8", enLinea: false },
  csv: { mime: "text/csv; charset=utf-8", enLinea: false },
  md: { mime: "text/markdown; charset=utf-8", enLinea: false },
};

export function extensionDe(ruta: string): string {
  const nombre = ruta.split("/").pop() ?? "";
  const punto = nombre.lastIndexOf(".");
  return punto === -1 ? "" : nombre.slice(punto + 1).toLowerCase();
}

export function esAdjunto(ruta: string) {
  const extension = extensionDe(ruta);
  return extension !== "md" && Object.hasOwn(TIPOS, extension);
}

export function tipoDeArchivo(ruta: string): TipoArchivo | null {
  const extension = extensionDe(ruta);
  return Object.hasOwn(TIPOS, extension) ? TIPOS[extension] : null;
}
