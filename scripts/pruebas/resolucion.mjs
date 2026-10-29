const RELATIVO_SIN_EXTENSION = /^\.{1,2}\/(?:.*\/)?[^/.]+$/;

export async function resolve(especificador, contexto, siguiente) {
  if (especificador === "next/server") {
    return { url: new URL("./next-server-falso.mjs", import.meta.url).href, shortCircuit: true };
  }
  try {
    return await siguiente(especificador, contexto);
  } catch (error) {
    if (error?.code === "ERR_MODULE_NOT_FOUND" && RELATIVO_SIN_EXTENSION.test(especificador)) {
      return siguiente(`${especificador}.ts`, contexto);
    }
    throw error;
  }
}
