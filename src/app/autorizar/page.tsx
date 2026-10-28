import Link from "next/link";
import { obtenerVault } from "@/lib/db";
import { validarSolicitud } from "@/lib/mcp/autorizacion";
import { hostDeRedirect } from "@/lib/mcp/oauth";
import { obtenerSesion } from "@/lib/sesion";
import styles from "./page.module.css";

const CAMPOS = [
  "client_id",
  "redirect_uri",
  "response_type",
  "code_challenge",
  "code_challenge_method",
  "state",
  "scope",
] as const;

export default async function AutorizarPage({ searchParams }: PageProps<"/autorizar">) {
  const parametros = await searchParams;
  const lector = {
    get: (nombre: string) => {
      const valor = parametros[nombre];
      return typeof valor === "string" ? valor : null;
    },
  };
  const resultado = await validarSolicitud(lector);
  const sesion = await obtenerSesion();
  const vault = sesion ? await obtenerVault(sesion.userId) : null;

  if (!resultado.ok) {
    return (
      <main className={styles.pagina}>
        <div className={styles.tarjeta}>
          <h1 className={styles.titulo}>No se puede conectar</h1>
          <p className={styles.descripcion}>{resultado.mensaje}</p>
        </div>
      </main>
    );
  }

  const { solicitud } = resultado;

  if (!vault) {
    return (
      <main className={styles.pagina}>
        <div className={styles.tarjeta}>
          <h1 className={styles.titulo}>Conecta tu vault primero</h1>
          <p className={styles.descripcion}>
            Para que {solicitud.clienteNombre} pueda leer y escribir tus notas, primero conecta tu vault de Obsidian.
          </p>
          <Link className={styles.boton} href="/conexiones">
            Ir a Conexiones
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className={styles.pagina}>
      <form className={styles.tarjeta} method="post" action="/api/oauth/aprobar">
        {CAMPOS.map((nombre) => {
          const valor = lector.get(nombre);
          return valor === null ? null : <input key={nombre} type="hidden" name={nombre} value={valor} />;
        })}
        <h1 className={styles.titulo}>Conectar con Claude</h1>
        <p className={styles.descripcion}>
          <strong>{solicitud.clienteNombre}</strong> quiere acceder a tu vault{" "}
          <strong>
            {vault.repoOwner}/{vault.repoName}
          </strong>{" "}
          como {sesion?.login}.
        </p>
        <p className={styles.nota}>Volverá a: {hostDeRedirect(solicitud.redirectUri)}</p>

        <fieldset className={styles.opciones}>
          <legend className={styles.leyenda}>Permisos</legend>
          <label className={styles.opcion}>
            <input type="radio" name="permiso" value="read" defaultChecked={!solicitud.permisos.includes("write")} />
            <span>
              <strong>Solo lectura</strong>
              <small>Buscar y leer notas.</small>
            </span>
          </label>
          <label className={styles.opcion}>
            <input type="radio" name="permiso" value="write" defaultChecked={solicitud.permisos.includes("write")} />
            <span>
              <strong>Lectura y escritura</strong>
              <small>Además, crear notas nuevas y agregar texto al final de una nota. Nunca borra ni sobrescribe.</small>
            </span>
          </label>
        </fieldset>

        <button className={styles.boton} type="submit" name="decision" value="aprobar">
          Autorizar
        </button>
        <button className={styles.secundario} type="submit" name="decision" value="cancelar">
          Cancelar
        </button>
        <p className={styles.nota}>Puedes revocar el acceso cuando quieras desde Conexiones.</p>
      </form>
    </main>
  );
}
