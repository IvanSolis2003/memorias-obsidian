export type VistaViewport = {
  arriba: number;
  alto: number;
  teclado: boolean;
};

const UMBRAL_TECLADO = 120;

const inicial: VistaViewport = { arriba: 0, alto: 0, teclado: false };
let ultima = inicial;

export function leerViewport(): VistaViewport {
  const vista = window.visualViewport;
  const alto = Math.round(vista?.height ?? window.innerHeight);
  const arriba = Math.round(vista?.offsetTop ?? 0);
  const teclado = window.innerHeight - alto > UMBRAL_TECLADO;
  if (ultima.alto !== alto || ultima.arriba !== arriba || ultima.teclado !== teclado) {
    ultima = { arriba, alto, teclado };
  }
  return ultima;
}

export function viewportDelServidor() {
  return inicial;
}

export function suscribirViewport(avisar: () => void) {
  const vista = window.visualViewport;
  vista?.addEventListener("resize", avisar);
  vista?.addEventListener("scroll", avisar);
  window.addEventListener("resize", avisar);
  return () => {
    vista?.removeEventListener("resize", avisar);
    vista?.removeEventListener("scroll", avisar);
    window.removeEventListener("resize", avisar);
  };
}
