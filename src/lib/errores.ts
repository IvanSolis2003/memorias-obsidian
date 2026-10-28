import { NextResponse } from "next/server";

export class ErrorApi extends Error {
  estado: number;
  datos: Record<string, unknown>;

  constructor(estado: number, mensaje: string, datos: Record<string, unknown> = {}) {
    super(mensaje);
    this.estado = estado;
    this.datos = datos;
  }
}

export function respuestaDeError(error: unknown) {
  if (error instanceof ErrorApi) {
    return NextResponse.json({ error: error.message, ...error.datos }, { status: error.estado });
  }
  return NextResponse.json({ error: "Ocurrió un error inesperado." }, { status: 500 });
}
