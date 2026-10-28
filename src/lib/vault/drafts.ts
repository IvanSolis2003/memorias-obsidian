import { abrirBase, type Borrador } from "./store";

export async function leerBorrador(clave: string, ruta: string) {
  return (await abrirBase()).get("borradores", [clave, ruta]);
}

export async function guardarBorrador(
  clave: string,
  ruta: string,
  texto: string,
  shaBase: string | null,
) {
  const borrador: Borrador = {
    clave,
    ruta,
    texto,
    shaBase,
    actualizado: new Date().toISOString(),
  };
  await (await abrirBase()).put("borradores", borrador);
}

export async function eliminarBorrador(clave: string, ruta: string) {
  await (await abrirBase()).delete("borradores", [clave, ruta]);
}
