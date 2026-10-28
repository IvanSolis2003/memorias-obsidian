export const MENSAJE_SIN_CONFIGURAR = "El conector de Claude aún no está configurado en el servidor.";

export function firmaConfigurada() {
  return Boolean(process.env.MCP_SIGNING_SECRET);
}

export function githubAppConfigurada() {
  return Boolean(process.env.GITHUB_APP_ID && process.env.GITHUB_APP_PRIVATE_KEY);
}
