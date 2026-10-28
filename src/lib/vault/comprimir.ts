import { CALIDAD_JPEG, LADO_MAXIMO_IMAGEN, esComprimible } from "./attachments";
import { extensionDe } from "./tiposArchivo";

const EXTENSIONES_FOTO = new Set(["heic", "heif"]);
const TIPOS_SIN_TOCAR = new Set(["image/gif", "image/svg+xml"]);

function esFoto(archivo: File) {
  const extension = extensionDe(archivo.name);
  if (extension === "gif" || extension === "svg" || TIPOS_SIN_TOCAR.has(archivo.type)) return false;
  return esComprimible(extension) || EXTENSIONES_FOTO.has(extension) || archivo.type.startsWith("image/");
}

export async function prepararImagen(archivo: File): Promise<File> {
  if (!esFoto(archivo)) return archivo;

  let imagen: ImageBitmap;
  try {
    imagen = await createImageBitmap(archivo, { imageOrientation: "from-image" });
  } catch {
    throw new Error("No se pudo procesar la imagen. Prueba con otra foto.");
  }

  const escala = Math.min(1, LADO_MAXIMO_IMAGEN / Math.max(imagen.width, imagen.height));
  const ancho = Math.max(1, Math.round(imagen.width * escala));
  const alto = Math.max(1, Math.round(imagen.height * escala));
  const lienzo = document.createElement("canvas");
  lienzo.width = ancho;
  lienzo.height = alto;
  const contexto = lienzo.getContext("2d");
  if (!contexto) {
    imagen.close();
    throw new Error("No se pudo comprimir la imagen.");
  }
  contexto.fillStyle = "#ffffff";
  contexto.fillRect(0, 0, ancho, alto);
  contexto.drawImage(imagen, 0, 0, ancho, alto);
  imagen.close();

  const blob = await new Promise<Blob | null>((resolver) =>
    lienzo.toBlob(resolver, "image/jpeg", CALIDAD_JPEG),
  );
  if (!blob) throw new Error("No se pudo comprimir la imagen.");

  const base = archivo.name.replace(/\.[^./\\]+$/, "") || "imagen";
  return new File([blob], `${base}.jpg`, { type: "image/jpeg", lastModified: Date.now() });
}
