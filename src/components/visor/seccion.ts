export function irATitulo(texto: string, ocurrencia = 0) {
  const objetivo = texto.trim().toLowerCase();
  const coincidencias = [...document.querySelectorAll<HTMLElement>("[data-titulo]")].filter(
    (titulo) => (titulo.dataset.titulo ?? "").trim().toLowerCase() === objetivo,
  );
  const destino = coincidencias[ocurrencia] ?? coincidencias[0];
  if (!destino) return false;
  destino.scrollIntoView({ block: "start" });
  return true;
}

export function irASeccion(texto: string) {
  return irATitulo(texto, 0);
}
