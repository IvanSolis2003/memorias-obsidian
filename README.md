# Memorias Obsidian

PWA para leer, editar y crear notas de un vault de Obsidian guardado en un repositorio de GitHub, con una interfaz que imita la app móvil de Obsidian. Pensada para usarla desde el iPhone y mantener el vault sincronizado con Obsidian en el computador.

Las notas viven solo en tu repositorio de GitHub y en la copia local del teléfono. La base de datos guarda únicamente metadatos de usuarios, conexiones y actividad.

## Empieza aquí

**[Guía de instalación paso a paso](docs/instalacion.md)**: cómo crear tu propia copia (GitHub App, base de datos en Neon, despliegue en Vercel), conectar tu vault, sincronizar con Obsidian, instalar la app en el iPhone y conectar tu Claude.

## Qué incluye

- Lectura de notas con wikilinks, embeds, callouts, backlinks, propiedades y esquema.
- Edición y creación de notas con commit en GitHub y detección de conflictos; adjuntos (foto, archivo, cámara) de hasta 4 MB.
- Búsqueda en todo el vault (título, ruta, tags y contenido) y selector rápido (menú ⋯ o Ctrl/Cmd+O).
- Grafo global y local con color por carpeta.
- Pestañas que se conservan al cerrar la app, marcadores y explorador de tags.
- PWA instalable con lectura sin conexión de lo ya sincronizado.
- Conector de Claude (MCP) opcional: buscar, leer, crear notas y agregar texto desde tus chats.
- Multiusuario: cada persona entra con su cuenta de GitHub y conecta su propio vault y su propio Claude.

El contenido de las notas nunca se guarda en la base de datos: vive en GitHub y en la copia local del dispositivo (IndexedDB).

## Stack

Next.js (App Router) y TypeScript, PostgreSQL en Neon con Prisma (solo metadatos), CSS Modules, CodeMirror 6, d3-force, minisearch y el SDK de MCP.

## Instalación local

1. `npm install` (genera el cliente de Prisma).
2. Copiar `.env.example` a `.env.local` y completar las variables.
3. `npm run db:desplegar` para aplicar las migraciones.
4. `npm run dev` y abrir http://localhost:3000.

Requiere Node.js 22 o superior. Comandos útiles: `npm run lint`, `npm run build`, `npm run db:validar`, `npm run db:migrar` y `npm run test:db`.

## Variables de entorno

| Variable | Para qué sirve |
|---|---|
| `GITHUB_APP_CLIENT_ID` | Client ID de la GitHub App. |
| `GITHUB_APP_CLIENT_SECRET` | Client secret de la GitHub App. |
| `GITHUB_APP_SLUG` | Último tramo de la URL pública de la App (`github.com/apps/<slug>`). |
| `DATABASE_URL` | Cadena de conexión de PostgreSQL (Neon). |
| `AUTH_SECRET` | Clave para cifrar la sesión. Se genera con `node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"`. |
| `REGISTRATION_MODE` | `allowlist` (solo `ALLOWED_GITHUB_USERS`) u `open` (cualquier cuenta de GitHub). |
| `ALLOWED_GITHUB_USERS` | Usuarios de GitHub permitidos, separados por coma. |
| `GITHUB_APP_ID` | ID numérico de la GitHub App (solo conector de Claude). |
| `GITHUB_APP_PRIVATE_KEY` | Clave privada `.pem` de la App (solo conector de Claude). En Vercel se pega tal cual o con los saltos de línea como `\n`. |
| `MCP_SIGNING_SECRET` | Firma los tokens del conector. Se genera igual que `AUTH_SECRET`. |
| `MCP_ALLOWED_REDIRECT_URIS` | Opcional. Direcciones de retorno OAuth permitidas, separadas por coma. Por defecto: `https://claude.ai/api/mcp/auth_callback`, `https://claude.com/api/mcp/auth_callback`, `http://localhost/callback` y `http://127.0.0.1/callback` (loopback con cualquier puerto). |

Todas se leen solo en el servidor.

## GitHub App

Permisos de repositorio: Contents (lectura y escritura) y Metadata (solo lectura), con "Expire user authorization tokens" activado y webhook desactivado. Instalable en "Any account" si otras personas van a usar tu instalación.

En la App hay que registrar, por cada entorno:

- Callback URL: `<dominio>/api/auth/github/callback` (admite hasta 10; útil para agregar también `http://localhost:3000/api/auth/github/callback`).
- Setup URL: `<dominio>/conexiones`, con "Redirect on update" marcado (admite una sola; la de producción manda).

### Rotar el Client secret

1. En la App, pestaña Credentials, generar un secret nuevo.
2. Actualizar `GITHUB_APP_CLIENT_SECRET` en `.env.local` y en Vercel y volver a desplegar.
3. Borrar el secret anterior en la App.

### Reinstalar la App

Desde Conexiones, "Administrar instalación" abre la configuración en GitHub. Si se desinstala por completo, repetir el asistente de Conexiones.

## Conector de Claude (MCP)

Cada usuario conecta su propio Claude desde Conexiones → pestaña Claude y desde sus chats puede buscar, leer, crear notas (con su carpeta si hace falta), agregar texto al final y reemplazar o borrar fragmentos de una nota, solo en su vault. No hay herramientas para borrar notas completas, renombrarlas ni moverlas; cada cambio queda como un commit que se puede deshacer en GitHub. Los pasos de configuración están en la [guía de instalación](docs/instalacion.md#paso-10-opcional-conectar-tu-claude).

Cómo funciona:

- La app es un servidor OAuth 2.1 con PKCE y registro dinámico de clientes (`/.well-known/oauth-authorization-server`, `/api/oauth/register`, `/api/oauth/authorize`, `/api/oauth/token`). El servidor MCP está en `/api/mcp` (Streamable HTTP) y responde 401 con `resource_metadata` sin token.
- Access token de 1 hora firmado con `MCP_SIGNING_SECRET`; refresh token opaco guardado solo como hash y rotado en cada uso. En cada llamada se comprueba en la base que la conexión no esté revocada.
- Las escrituras usan el token de instalación de la GitHub App, limitado al repositorio del usuario, y quedan como commits `Memorias Obsidian (Claude): crear <ruta>` o `Memorias Obsidian (Claude): agregar a <ruta>`. Límite: 30 escrituras por hora por usuario.
- Revocar: desde el panel (por usuario) o rotando `MCP_SIGNING_SECRET` (corte de emergencia para todos).
- La búsqueda por contenido usa la API de búsqueda de código de GitHub (límite bajo y solo la rama por defecto); si no está disponible, la herramienta responde solo con coincidencias por título y ruta e informa el motivo.

## PWA y modo sin conexión

En el iPhone: abrir la URL en Safari → Compartir → "Añadir a pantalla de inicio". El service worker (`public/sw.js`, solo en producción) guarda los archivos estáticos y las páginas visitadas; las notas salen de IndexedDB, así que sin conexión se pueden leer, buscar y ver en el grafo las notas ya sincronizadas. Editar y subir adjuntos requiere conexión. Cerrar sesión borra las cachés del service worker y la copia local.

Si se cambia el comportamiento del service worker hay que subir `VERSION` en `public/sw.js`.

## Sincronización con Obsidian

La app y Obsidian comparten el repositorio de GitHub:

- Lo guardado desde la app aparece en el computador con **Git: Pull** (o en el siguiente ciclo automático del plugin Obsidian Git).
- Lo editado en el computador llega a la app con **Git: Commit-and-sync** y luego **Actualizar** en el menú ⋯ de la app.

Las carpetas ocultas (`.obsidian`, `.obsidian-mcp`, `.git`) nunca se leen, se muestran ni se escriben desde la app.

## Seguridad

- Todas las rutas `/api` exigen sesión (salvo login, OAuth y el conector, que usan token o PKCE); las páginas sin sesión redirigen al login.
- Las cookies de sesión van cifradas, `httpOnly` y `SameSite=Lax`; el token de GitHub nunca llega al navegador ni a la base de datos.
- Un usuario no puede leer, escribir ni conectar el repositorio de otro: el repositorio y la rama salen siempre de la base de datos según la sesión, nunca de lo que envía el cliente.
- `save` y `upload` rechazan rutas con `..`, ocultas, absolutas, con `\`, nulos o extensiones no permitidas.
- Cabeceras de seguridad (`X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`) y `Content-Security-Policy` con nonce por petición (se genera en `src/proxy.ts`; por eso las páginas son dinámicas).
- Protección CSRF: toda petición que modifica datos en `/api/*` debe venir del mismo origen (`Origin` o `Sec-Fetch-Site`). `/api/mcp` y los endpoints OAuth públicos usan token o PKCE.
- Límite de intentos por IP en `login`, `callback`, `authorize`, `register` y `token` (respuesta 429). Es en memoria de cada instancia de Vercel: un freno básico; para un límite estricto conviene sumar una regla de Rate Limiting en el Firewall de Vercel.
- `/cuenta` permite **Eliminar mi cuenta**: borra en cascada usuario, vault, conexiones de Claude y actividad, y vacía la copia local. No toca el repositorio ni desinstala la GitHub App. `/privacidad` explica qué se guarda y cómo revocar el acceso.
- `npm run test:db` comprueba el aislamiento entre usuarios contra la base real.

## Despliegue en Vercel

Cada push a la rama principal despliega a producción. La región de las funciones está en `vercel.json` (`gru1`, São Paulo); cámbiala por la más cercana a tu base en Neon.

Las migraciones no se aplican solas en el despliegue: antes de publicar un cambio de esquema, ejecutar `npm run db:desplegar` con la `DATABASE_URL` de producción. Las variables nuevas solo aplican a despliegues nuevos.
