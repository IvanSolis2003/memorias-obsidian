import Link from "next/link";
import styles from "./page.module.css";

export const dynamic = "force-dynamic";

export const metadata = { title: "Privacidad · Memorias Ivan" };

export default function PrivacidadPage() {
  return (
    <main className={styles.pagina}>
      <article className={styles.documento}>
        <h1>Privacidad</h1>
        <p className={styles.resumen}>
          Memorias Ivan lee y escribe las notas de tu vault de Obsidian directamente en tu repositorio de GitHub. Tus notas nunca se
          guardan en nuestros servidores.
        </p>

        <h2>Qué guardamos en la base de datos</h2>
        <p>Solo metadatos:</p>
        <ul>
          <li>Tu usuario de GitHub, su identificador, tu nombre y tu foto de perfil, y las fechas de registro y último acceso.</li>
          <li>El vault que elegiste: repositorio, rama y subcarpeta.</li>
          <li>Las conexiones de Claude que autorizaste: nombre del cliente, permisos, fechas y una huella (hash) de su clave de renovación.</li>
          <li>Un registro de actividad: qué acción se hizo (guardar, crear, adjuntar, agregar, conectar o revocar), la ruta de la nota y la fecha. Nunca el contenido.</li>
        </ul>

        <h2>Qué no guardamos</h2>
        <ul>
          <li>El contenido de tus notas y adjuntos. Viven en tu repositorio de GitHub y en una copia local dentro de tu dispositivo (el almacenamiento del navegador), que se borra al cerrar sesión.</li>
          <li>Tu contraseña de GitHub. El acceso se hace con el inicio de sesión de GitHub.</li>
        </ul>

        <h2>Tu sesión y los tokens de GitHub</h2>
        <p>
          El token de acceso de GitHub viaja solo en una cookie cifrada y marcada como <em>httpOnly</em>, por lo que el código de la
          página no puede leerla. El servidor lo usa para hablar con GitHub en tu nombre y nunca lo envía al navegador ni lo guarda en
          la base de datos.
        </p>

        <h2>Permisos de la GitHub App</h2>
        <p>
          La app pide acceso de lectura y escritura al contenido y lectura de los metadatos, y solo de los repositorios donde tú la
          instalas. Puedes elegir un único repositorio al instalarla.
        </p>

        <h2>Conector de Claude</h2>
        <p>
          Si conectas tu Claude, este podrá buscar y leer notas de tu vault y, si lo autorizas, crear notas nuevas y agregar texto al
          final. No puede borrar, renombrar, mover ni sobrescribir. Lo que Claude lea queda sujeto a las condiciones y a la política de
          privacidad de Anthropic. Todo lo que escribe queda como un commit en tu repositorio, identificado como «Memorias Ivan
          (Claude)».
        </p>

        <h2>Cómo revocar el acceso</h2>
        <ul>
          <li>Conexiones de Claude: en Conexiones → Claude, botón «Revocar». Deja de funcionar de inmediato.</li>
          <li>Eliminar tus datos: en Cuenta y privacidad → «Eliminar mi cuenta».</li>
          <li>
            Quitar la GitHub App: en{" "}
            <a href="https://github.com/settings/installations" target="_blank" rel="noreferrer">
              la configuración de GitHub
            </a>
            . Eliminar la cuenta no desinstala la App ni toca tu repositorio.
          </li>
        </ul>

        <p className={styles.pie}>
          <Link href="/">Volver a la app</Link>
        </p>
      </article>
    </main>
  );
}
