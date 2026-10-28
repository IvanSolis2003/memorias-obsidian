export async function pedirJson<T>(url: string, init?: RequestInit): Promise<T> {
  const respuesta = await fetch(url, init);
  const datos = await respuesta.json().catch(() => null);
  if (!respuesta.ok) {
    throw new Error(datos?.error ?? "No se pudo completar la solicitud.");
  }
  return datos as T;
}

export function enviarJson(metodo: string, cuerpo: unknown): RequestInit {
  return {
    method: metodo,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(cuerpo),
  };
}

export function mensajeDeError(error: unknown) {
  return error instanceof Error ? error.message : "Ocurrió un error inesperado.";
}
