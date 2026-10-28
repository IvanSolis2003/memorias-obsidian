import { obtenerClienteMcp } from "../db";
import { firmaConfigurada, MENSAJE_SIN_CONFIGURAR } from "./configuracion";
import { challengeValido, permisosSolicitados, redirectRegistrada } from "./oauth";
import type { Permiso } from "./tokens";

export type SolicitudAutorizacion = {
  clientId: string;
  clienteNombre: string;
  redirectUri: string;
  codeChallenge: string;
  state: string | null;
  permisos: Permiso[];
};

export type ResultadoSolicitud =
  | { ok: true; solicitud: SolicitudAutorizacion }
  | { ok: false; mensaje: string; redirigir?: { uri: string; error: string; state: string | null } };

type Lector = { get(nombre: string): string | null | undefined | File };

function texto(lector: Lector, nombre: string) {
  const valor = lector.get(nombre);
  return typeof valor === "string" ? valor : null;
}

export async function validarSolicitud(lector: Lector): Promise<ResultadoSolicitud> {
  if (!firmaConfigurada()) return { ok: false, mensaje: MENSAJE_SIN_CONFIGURAR };
  const clientId = texto(lector, "client_id");
  const redirectUri = texto(lector, "redirect_uri");
  if (!clientId || !redirectUri) {
    return { ok: false, mensaje: "La solicitud de conexión está incompleta." };
  }
  const cliente = await obtenerClienteMcp(clientId);
  if (!cliente || !redirectRegistrada(cliente.redirectUris, redirectUri)) {
    return { ok: false, mensaje: "La aplicación que pide acceso no está registrada o su dirección de retorno no es válida." };
  }

  const state = texto(lector, "state");
  const fallo = (error: string, mensaje: string): ResultadoSolicitud => ({
    ok: false,
    mensaje,
    redirigir: { uri: redirectUri, error, state },
  });
  if (texto(lector, "response_type") !== "code") {
    return fallo("unsupported_response_type", "Tipo de respuesta no soportado.");
  }
  const codeChallenge = texto(lector, "code_challenge");
  if (!challengeValido(codeChallenge, texto(lector, "code_challenge_method"))) {
    return fallo("invalid_request", "Falta PKCE con método S256.");
  }

  return {
    ok: true,
    solicitud: {
      clientId,
      clienteNombre: cliente.nombre,
      redirectUri,
      codeChallenge: codeChallenge as string,
      state,
      permisos: permisosSolicitados(texto(lector, "scope")),
    },
  };
}

export function urlDeRetorno(redirectUri: string, parametros: Record<string, string | null>) {
  const destino = new URL(redirectUri);
  for (const [nombre, valor] of Object.entries(parametros)) {
    if (valor !== null) destino.searchParams.set(nombre, valor);
  }
  return destino;
}
