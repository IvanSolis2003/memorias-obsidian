import { extensionDe, tipoDeArchivo } from "./tiposArchivo.ts";

export const LIMITE_ADJUNTO_BYTES = 4 * 1024 * 1024;
export const CARPETA_ADJUNTOS_POR_DEFECTO = "Adjuntos";
export const LADO_MAXIMO_IMAGEN = 2000;
export const CALIDAD_JPEG = 0.85;

const CARACTERES_PROHIBIDOS = /[*"\\/<>:|?#^[\]\u0000-\u001f]/g;
const LARGO_MAXIMO_NOMBRE = 120;

const MIMES_POR_EXTENSION: Record<string, string[]> = {
  png: ["image/png"],
  jpg: ["image/jpeg"],
  jpeg: ["image/jpeg"],
  gif: ["image/gif"],
  webp: ["image/webp"],
  svg: ["image/svg+xml"],
  pdf: ["application/pdf"],
  mp3: ["audio/mpeg", "audio/mp3"],
  m4a: ["audio/mp4", "audio/x-m4a", "audio/m4a"],
  wav: ["audio/wav", "audio/x-wav", "audio/wave"],
  docx: ["application/vnd.openxmlformats-officedocument.wordprocessingml.document"],
  xlsx: ["application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"],
  pptx: ["application/vnd.openxmlformats-officedocument.presentationml.presentation"],
  txt: ["text/plain"],
  csv: ["text/csv", "text/plain", "application/vnd.ms-excel"],
  md: ["text/markdown", "text/plain", "text/x-markdown"],
};

const IMAGENES = new Set(["png", "jpg", "jpeg", "gif", "webp", "svg"]);
const AUDIOS = new Set(["mp3", "m4a", "wav"]);
const TEXTOS = new Set(["txt", "csv", "md"]);
const COMPRIMIBLES = new Set(["png", "jpg", "jpeg", "webp"]);

export const EXTENSIONES_PERMITIDAS = Object.keys(MIMES_POR_EXTENSION);

export function esImagen(extension: string) {
  return IMAGENES.has(extension);
}

export function esAudio(extension: string) {
  return AUDIOS.has(extension);
}

export function esComprimible(extension: string) {
  return COMPRIMIBLES.has(extension);
}

export function sanearNombre(nombre: string) {
  const sinRuta = nombre.split(/[\\/]/).pop() ?? "";
  const extension = extensionDe(sinRuta);
  const base = extension ? sinRuta.slice(0, -(extension.length + 1)) : sinRuta;
  const limpia = base
    .replace(CARACTERES_PROHIBIDOS, " ")
    .replace(/\.{2,}/g, ".")
    .replace(/\s+/g, " ")
    .replace(/^[.\s]+|[.\s]+$/g, "");
  const recortada = limpia.slice(0, LARGO_MAXIMO_NOMBRE).trim() || "archivo";
  return extension ? `${recortada}.${extension}` : recortada;
}

function dos(numero: number) {
  return String(numero).padStart(2, "0");
}

export function nombrePegado(fecha: Date, extension: string) {
  const marca =
    `${fecha.getFullYear()}${dos(fecha.getMonth() + 1)}${dos(fecha.getDate())}` +
    `${dos(fecha.getHours())}${dos(fecha.getMinutes())}${dos(fecha.getSeconds())}`;
  return `Pasted image ${marca}.${extension}`;
}

export function conSufijo(nombre: string, intento: number) {
  if (intento === 0) return nombre;
  const extension = extensionDe(nombre);
  const base = extension ? nombre.slice(0, -(extension.length + 1)) : nombre;
  return extension ? `${base} ${intento}.${extension}` : `${base} ${intento}`;
}

export function carpetaDestino(valor: unknown, carpetaNota: string) {
  if (typeof valor !== "string" || !valor.trim()) return CARPETA_ADJUNTOS_POR_DEFECTO;
  const configurada = valor.trim();
  if (configurada === "/") return "";
  if (configurada === "." || configurada === "./") return carpetaNota;
  if (configurada.startsWith("./")) {
    const resto = configurada.slice(2).replace(/^\/+|\/+$/g, "");
    return [carpetaNota, resto].filter(Boolean).join("/");
  }
  return configurada.replace(/^\/+|\/+$/g, "");
}

export function formatearTamano(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(bytes < 10 * 1024 ? 1 : 0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function enlaceDeAdjunto(referencia: string) {
  const extension = extensionDe(referencia);
  const incrustable = esImagen(extension) || esAudio(extension) || extension === "pdf";
  return incrustable ? `![[${referencia}]]` : `[[${referencia}]]`;
}

function empieza(bytes: Uint8Array, firma: number[], desde = 0) {
  return firma.every((valor, indice) => bytes[desde + indice] === valor);
}

function texto(bytes: Uint8Array, desde: number, hasta: number) {
  return String.fromCharCode(...bytes.slice(desde, hasta));
}

function esTextoPlano(bytes: Uint8Array) {
  return !bytes.slice(0, 8000).includes(0);
}

function esSvgSeguro(bytes: Uint8Array) {
  const contenido = new TextDecoder("utf-8", { fatal: false }).decode(bytes);
  if (!/<svg[\s>]/i.test(contenido)) return "No parece un SVG válido.";
  if (/<script|javascript:|<foreignObject|\son\w+\s*=/i.test(contenido)) {
    return "El SVG contiene código activo y no se puede adjuntar.";
  }
  return null;
}

export function verificarContenido(bytes: Uint8Array, extension: string): string | null {
  switch (extension) {
    case "png":
      return empieza(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]) ? null : "El archivo no es un PNG real.";
    case "jpg":
    case "jpeg":
      return empieza(bytes, [0xff, 0xd8, 0xff]) ? null : "El archivo no es un JPEG real.";
    case "gif":
      return ["GIF87a", "GIF89a"].includes(texto(bytes, 0, 6)) ? null : "El archivo no es un GIF real.";
    case "webp":
      return texto(bytes, 0, 4) === "RIFF" && texto(bytes, 8, 12) === "WEBP" ? null : "El archivo no es un WebP real.";
    case "pdf":
      return texto(bytes, 0, 5) === "%PDF-" ? null : "El archivo no es un PDF real.";
    case "mp3":
      return texto(bytes, 0, 3) === "ID3" || (bytes[0] === 0xff && ((bytes[1] ?? 0) & 0xe0) === 0xe0)
        ? null
        : "El archivo no es un MP3 real.";
    case "m4a":
      return texto(bytes, 4, 8) === "ftyp" ? null : "El archivo no es un M4A real.";
    case "wav":
      return texto(bytes, 0, 4) === "RIFF" && texto(bytes, 8, 12) === "WAVE" ? null : "El archivo no es un WAV real.";
    case "docx":
    case "xlsx":
    case "pptx":
      return empieza(bytes, [0x50, 0x4b, 0x03, 0x04]) ? null : "El archivo no es un documento de Office real.";
    case "svg":
      return esSvgSeguro(bytes);
    default:
      return TEXTOS.has(extension) && esTextoPlano(bytes) ? null : "El archivo no es un texto válido.";
  }
}

export function validarAdjunto(nombre: string, tipoDeclarado: string, tamano: number) {
  const extension = extensionDe(nombre);
  if (!extension || !tipoDeArchivo(nombre) || !EXTENSIONES_PERMITIDAS.includes(extension)) {
    return "Ese tipo de archivo no está permitido. Se aceptan imágenes, PDF, audio (mp3, m4a, wav) y documentos (docx, xlsx, pptx, txt, csv, md).";
  }
  if (tamano === 0) return "El archivo está vacío.";
  if (tamano > LIMITE_ADJUNTO_BYTES) {
    return `El archivo supera el máximo de ${formatearTamano(LIMITE_ADJUNTO_BYTES)}.`;
  }
  const declarado = tipoDeclarado.split(";")[0].trim().toLowerCase();
  const sinInformacion = !declarado || declarado === "application/octet-stream";
  if (!sinInformacion && !MIMES_POR_EXTENSION[extension].includes(declarado)) {
    return "El tipo del archivo no coincide con su extensión.";
  }
  return null;
}
