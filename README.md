# Memorias Ivan

PWA para leer, editar y crear notas de un vault de Obsidian guardado en un repositorio privado de GitHub, con una interfaz que imita la app móvil de Obsidian.

Las notas viven solo en GitHub y en la copia local del teléfono. La base de datos guarda únicamente metadatos de usuarios, conexiones y auditoría.

Producción: https://memorias-ivan.vercel.app

## Instalación local

1. `npm install` (genera el cliente de Prisma).
2. Copiar `.env.example` a `.env.local` y completar las variables.
3. `npm run db:desplegar` para aplicar las migraciones.
4. `npm run dev` y abrir http://localhost:3000.

Comandos útiles: `npm run lint`, `npm run build`, `npm run db:validar`, `npm run db:migrar` y `npm run test:db`.

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

| `GITHUB_APP_ID` | ID numérico de la GitHub App (conector de Claude). |
| `GITHUB_APP_PRIVATE_KEY` | Clave privada `.pem` de la App. En Vercel se pega con los saltos de línea como `\n`. |
| `MCP_SIGNING_SECRET` | Firma los tokens del conector. Se genera igual que `AUTH_SECRET`. |
| `MCP_ALLOWED_REDIRECT_URIS` | Opcional. Direcciones de retorno OAuth permitidas, separadas por coma. Por defecto: `https://claude.ai/api/mcp/auth_callback`, `https://claude.com/api/mcp/auth_callback`, `http://localhost/callback` y `http://127.0.0.1/callback` (loopback con cualquier puerto). |

Todas se leen solo en el servidor.

## GitHub App

Permisos de repositorio: Contents (lectura y escritura) y Metadata (solo lectura), con "Expire user authorization tokens" activado y webhook desactivado. Instalable en cualquier cuenta.

En la App hay que registrar, por cada entorno:
- Redirect URI: `<dominio>/api/auth/github/callback`.
- Setup URL: `<dominio>/conexiones`, con "Redirect on update" marcado (admite una sola; la de producción manda).

### Rotar el Client secret

1. En la App, pestaña Credentials, generar un secret nuevo.
2. Actualizar `GITHUB_APP_CLIENT_SECRET` en `.env.local` y en Vercel (`vercel env add GITHUB_APP_CLIENT_SECRET production --sensitive --force`) y volver a desplegar.
3. Borrar el secret anterior en la App.

### Reinstalar la App

Desde `/conexiones` de la app, "Administrar instalación" abre la configuración en GitHub. Si se desinstala por completo, repetir el asistente de Conexiones.

## Qué incluye

- Lectura de notas con wikilinks, embeds, callouts, backlinks, propiedades y esquema.
- Edición y creación de notas con commit en GitHub y detección de conflictos; adjuntos (foto, archivo, cámara) de hasta 4 MB.
- Búsqueda en todo el vault (título, ruta, tags y contenido) y selector rápido (menú ⋯ o Ctrl/Cmd+O).
- Grafo global y local con color por carpeta.
- Pestañas que se conservan al cerrar la app.
- PWA instalable con lectura sin conexión de lo ya sincronizado.

El contenido de las notas nunca se guarda en la base de datos: vive en GitHub y en la copia local del dispositivo (IndexedDB).

## Conector de Claude (MCP)

Cada usuario conecta su propio Claude desde Conexiones → pestaña Claude y desde sus chats puede buscar, leer, crear notas y agregar texto al final, solo en su vault. No hay herramientas para borrar, renombrar, mover ni sobrescribir.

Configuración, una sola vez:

1. En la GitHub App → General → "Private keys" → **Generate a private key**. Se descarga un `.pem`; no se sube al repositorio (`*.pem` está ignorado).
2. Anotar el **App ID** (arriba en la misma página).
3. Cargar las variables en Vercel (`GITHUB_APP_ID`, `GITHUB_APP_PRIVATE_KEY`, `MCP_SIGNING_SECRET`) y volver a desplegar. Para la clave privada: `vercel env add GITHUB_APP_PRIVATE_KEY production --sensitive` y pegar el contenido con los saltos de línea escritos como `\n`.
4. En Claude: Ajustes → Conectores → "Agregar conector personalizado" y pegar `https://<dominio>/api/mcp`. Al conectar, Claude abre la pantalla de consentimiento de la app, donde se elige **Solo lectura** o **Lectura y escritura**.

Cómo funciona:

- La app es un servidor OAuth 2.1 con PKCE y registro dinámico de clientes (`/.well-known/oauth-authorization-server`, `/api/oauth/register`, `/api/oauth/authorize`, `/api/oauth/token`). El servidor MCP está en `/api/mcp` (Streamable HTTP) y responde 401 con `resource_metadata` sin token.
- Access token de 1 hora firmado con `MCP_SIGNING_SECRET`; refresh token opaco guardado solo como hash y rotado en cada uso. En cada llamada se comprueba en la base que la conexión no esté revocada.
- Las escrituras usan el token de instalación de la GitHub App, limitado al repositorio del usuario, y quedan como commits `Memorias Ivan (Claude): crear <ruta>` o `Memorias Ivan (Claude): agregar a <ruta>`. Límite: 30 escrituras por hora por usuario.
- Revocar: desde el panel (por usuario) o rotando `MCP_SIGNING_SECRET` (corte de emergencia para todos).
- La búsqueda por contenido usa la API de búsqueda de código de GitHub (límite bajo y solo la rama por defecto); si no está disponible, la herramienta responde solo con coincidencias por título y ruta e informa el motivo.

## PWA y modo sin conexión

En el iPhone: abrir la URL en Safari → Compartir → "Añadir a pantalla de inicio". El service worker (`public/sw.js`, solo en producción) guarda los archivos estáticos y las páginas visitadas; las notas salen de IndexedDB, así que sin conexión se pueden leer, buscar y ver en el grafo las notas ya sincronizadas. Editar y subir adjuntos requiere conexión. Cerrar sesión borra las cachés del service worker y la copia local.

Si se cambia el comportamiento del service worker hay que subir `VERSION` en `public/sw.js`.

## Sincronización con Obsidian

La app y Obsidian comparten el repositorio de GitHub:

- Lo guardado desde la app aparece en el computador con **Obsidian Git: Pull** (o en el siguiente ciclo automático del plugin).
- Lo editado en el computador llega a la app con **Obsidian Git: Commit-and-sync** y luego **Actualizar** en el menú ⋯ de la app.

Las carpetas ocultas (`.obsidian`, `.obsidian-mcp`, `.git`) nunca se leen, se muestran ni se escriben desde la app.

## Pruebas y revisión de seguridad

- `npm run test:db`: prueba de aislamiento entre usuarios contra la base real.
- Revisión de seguridad de MEM-18 (63 comprobaciones con dos usuarios y un GitHub simulado): todas las rutas `/api` exigen sesión; páginas y APIs sin sesión redirigen o devuelven 401; cookies falsas o cifradas con otra clave se rechazan; un usuario no puede leer, escribir ni conectar el repositorio de otro; `save` y `upload` ignoran `owner`, `repo` y `userId` enviados por el cliente y rechazan rutas con `..`, ocultas, absolutas, con `\`, nulos o extensiones no permitidas; el HTML, el payload RSC y el bundle del cliente no contienen tokens ni secretos.
- Cabeceras de seguridad en todas las respuestas: `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy` y `Permissions-Policy`.
- `Content-Security-Policy` con nonce por petición (`script-src 'self' 'nonce-…' 'strict-dynamic'`, sin `unsafe-eval` en producción, `frame-ancestors 'none'`, `object-src 'none'`). Se genera en `src/proxy.ts`; por eso las páginas son dinámicas.
- Protección CSRF: toda petición que modifica datos en `/api/*` debe venir del mismo origen (`Origin` o `Sec-Fetch-Site`); además la cookie de sesión es `SameSite=Lax`. `/api/mcp` y los endpoints OAuth públicos usan token o PKCE y quedan fuera de esta comprobación.
- Límite de intentos por IP en `login`, `callback`, `authorize`, `register` y `token` (respuesta 429). Es en memoria de cada instancia de Vercel, por lo que es un freno básico; para un límite estricto conviene sumar una regla de Rate Limiting en el Firewall de Vercel.
- Cuenta y privacidad: `/cuenta` muestra los datos guardados y permite **Eliminar mi cuenta** (confirmando el usuario de GitHub): borra en cascada usuario, vault, conexiones de Claude y actividad, las conexiones dejan de funcionar al instante y se vacía la copia local. No toca el repositorio ni desinstala la GitHub App. `/privacidad` (pública) explica qué se guarda y cómo revocar el acceso.

## Despliegue en Vercel

El proyecto está conectado al repositorio: cada push a `main` despliega a producción. La región de las funciones es `gru1` (São Paulo), cerca de la base en Neon.

Para desplegar a mano: `vercel deploy --prod`. Las variables se administran con `vercel env`.

Las migraciones no se aplican solas en el despliegue: antes de publicar un cambio de esquema, ejecutar `npm run db:desplegar` con la `DATABASE_URL` de producción.
