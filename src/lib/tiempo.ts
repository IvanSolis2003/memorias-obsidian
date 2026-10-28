export function haceCuanto(iso: string, ahora = Date.now()) {
  const segundos = Math.max(0, Math.round((ahora - new Date(iso).getTime()) / 1000));
  if (segundos < 60) return "hace un momento";
  const minutos = Math.round(segundos / 60);
  if (minutos < 60) return `hace ${minutos} min`;
  const horas = Math.round(minutos / 60);
  if (horas < 24) return `hace ${horas} h`;
  const dias = Math.round(horas / 24);
  return `hace ${dias} ${dias === 1 ? "día" : "días"}`;
}

export function fechaLegible(iso: string) {
  return new Date(iso).toLocaleString("es-CL", { dateStyle: "medium", timeStyle: "short" });
}
