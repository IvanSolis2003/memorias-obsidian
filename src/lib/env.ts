export function requerirVariable(nombre: string): string {
  const valor = process.env[nombre];
  if (!valor) {
    throw new Error(`Falta la variable de entorno ${nombre}`);
  }
  return valor;
}

export function modoRegistro(): "allowlist" | "open" {
  return process.env.REGISTRATION_MODE === "open" ? "open" : "allowlist";
}

export function usuarioPermitido(login: string): boolean {
  if (modoRegistro() === "open") return true;
  const permitidos = (process.env.ALLOWED_GITHUB_USERS ?? "")
    .split(",")
    .map((usuario) => usuario.trim().toLowerCase())
    .filter(Boolean);
  return permitidos.includes(login.toLowerCase());
}
