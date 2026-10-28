import { IconoGithub } from "@/components/Icons";
import { destinoVolverValido } from "@/lib/auth";
import styles from "./page.module.css";

const MENSAJES_ERROR: Record<string, string> = {
  no_autorizado: "Tu cuenta de GitHub no está autorizada para usar Memorias Obsidian por ahora.",
  estado_invalido: "La solicitud de acceso expiró o no es válida. Intenta de nuevo.",
  github: "No se pudo completar el acceso con GitHub. Intenta de nuevo.",
  sesion_expirada: "Tu sesión expiró. Vuelve a entrar.",
  servidor: "Ocurrió un problema en el servidor. Intenta de nuevo en unos minutos.",
};

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const { error, volver } = await searchParams;
  const mensaje = typeof error === "string" ? MENSAJES_ERROR[error] : undefined;
  const destinoVolver = typeof volver === "string" && destinoVolverValido(volver) ? volver : null;
  const enlaceLogin = destinoVolver
    ? `/api/auth/github/login?volver=${encodeURIComponent(destinoVolver)}`
    : "/api/auth/github/login";

  return (
    <main className={styles.pagina}>
      <div className={styles.tarjeta}>
        <h1 className={styles.titulo}>Memorias Obsidian</h1>
        <p className={styles.descripcion}>Tu vault de Obsidian en el iPhone.</p>
        {mensaje && (
          <p className={styles.error} role="alert">
            {mensaje}
          </p>
        )}
        <a className={styles.boton} href={enlaceLogin}>
          <IconoGithub />
          Continuar con GitHub
        </a>
        <a className={styles.enlace} href="/privacidad">
          Privacidad
        </a>
      </div>
    </main>
  );
}
