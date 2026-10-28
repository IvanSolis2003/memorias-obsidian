# Guía de instalación de Memorias Obsidian

Esta guía te lleva de cero a tener tu propia copia funcionando: la app en internet, conectada a tu vault de Obsidian, instalada en el iPhone y, si quieres, conectada a tu Claude. No necesitas pagar nada: todo se puede hacer con los planes gratuitos de GitHub, Neon y Vercel.

Tiempo estimado: entre 45 y 60 minutos la primera vez.

## Cómo encajan las piezas

- **Tu vault** vive en un repositorio **privado** de GitHub. Es la única copia "oficial" de tus notas.
- **La app** (este proyecto) corre en Vercel. Lee y escribe tus notas directamente en tu repositorio de GitHub.
- **Neon** guarda una base de datos pequeña con metadatos (usuarios, vault elegido, conexiones de Claude y actividad). Nunca guarda el contenido de tus notas.
- **Una GitHub App propia** es lo que permite iniciar sesión con GitHub y dar permiso a la app sobre tu repositorio.
- **Obsidian en el computador** se sincroniza con el mismo repositorio mediante el plugin Obsidian Git.

```
iPhone (PWA) ──► Vercel (la app) ──► GitHub (repositorio del vault) ◄── Obsidian Git ◄── Obsidian (computador)
                      │
                      └──► Neon (solo metadatos)
```

## Lo que necesitas antes de empezar

- Una cuenta de **GitHub**.
- Una cuenta en **Neon** (https://neon.tech) y otra en **Vercel** (https://vercel.com). Ambas pueden crearse entrando con GitHub.
- **Node.js 22 o superior** instalado en tu computador (https://nodejs.org). Solo se usa para ejecutar las migraciones de la base de datos y, si quieres, para desarrollar.
- **Git** instalado.
- **Obsidian** en el computador y un iPhone (o cualquier móvil con navegador moderno).

## Paso 1. Tener el vault en un repositorio privado de GitHub

Si tu vault ya está en un repositorio privado de GitHub, pasa al paso 2.

1. En GitHub crea un repositorio **privado** y vacío, por ejemplo `mi-vault`.
2. En la carpeta de tu vault, desde una terminal:

   ```
   git init
   git branch -M main
   git remote add origin https://github.com/<tu-usuario>/mi-vault.git
   ```

3. Crea un archivo `.gitignore` en la raíz del vault con estas líneas, para no subir archivos que cambian a cada rato:

   ```
   .obsidian/workspace.json
   .obsidian/workspaces.json
   .obsidian/cache
   .trash/
   ```

4. Sube el contenido:

   ```
   git add .
   git commit -m "Primer commit del vault"
   git push -u origin main
   ```

Si prefieres no usar la terminal, instala primero el plugin Obsidian Git (paso 9) y usa sus comandos.

La app **nunca** lee ni escribe carpetas ocultas (`.obsidian`, `.git`, etc.).

## Paso 2. Copiar este repositorio a tu cuenta

1. Entra a este repositorio en GitHub y toca **Fork** (arriba a la derecha) para crear tu propia copia, por ejemplo `tu-usuario/memorias-obsidian`.
2. Tu copia es la que conectarás a Vercel. Cualquier cambio que quieras hacer al código se hace en ella.

## Paso 3. Crear la base de datos en Neon

1. En https://console.neon.tech crea un proyecto nuevo. Elige la región más cercana a donde vives y, si puedes, la misma región que usarás en Vercel.
2. En el panel del proyecto toca **Connect** (o *Connection details*) y copia la **cadena de conexión** (empieza con `postgresql://`). La que Neon muestra por defecto, con *pooler*, funciona bien.
3. Guárdala en un lugar seguro: es el valor de `DATABASE_URL`. Trátala como una contraseña.

## Paso 4. Crear el proyecto en Vercel para conocer tu dirección

Necesitas la dirección pública de tu app (por ejemplo `https://memorias-obsidian.vercel.app`) para configurar la GitHub App en el paso siguiente.

1. En https://vercel.com toca **Add New… → Project** y elige tu fork `memorias-obsidian`.
2. Deja los valores por defecto (Vercel detecta Next.js solo) y toca **Deploy**. Este primer despliegue todavía no funcionará del todo porque faltan las variables: no importa.
3. Cuando termine, entra al proyecto → **Settings → Domains** y anota tu dirección, que será parecida a `https://memorias-obsidian-xxxx.vercel.app`. Si prefieres otra, puedes cambiarla ahí. En el resto de la guía la llamamos `<tu-dominio>`.

La región en que corren las funciones está en `vercel.json` (`gru1`, São Paulo). Cámbiala por la más cercana a tu base en Neon si lo necesitas (por ejemplo `iad1` para el este de Estados Unidos).

## Paso 5. Crear tu GitHub App

La GitHub App tiene dos trabajos: permitir iniciar sesión con tu cuenta y dar acceso a la app al repositorio de tu vault.

1. Entra a https://github.com/settings/apps y toca **New GitHub App**.
2. Completa el formulario así:

   | Campo | Valor |
   |---|---|
   | GitHub App name | Un nombre único, por ejemplo `Memorias Obsidian de <tu-usuario>` |
   | Homepage URL | La dirección de tu fork o `<tu-dominio>` |
   | Callback URL | `<tu-dominio>/api/auth/github/callback` (sin barra al final) |
   | Expire user authorization tokens | **Marcado** |
   | Request user authorization (OAuth) during installation | Sin marcar |
   | Setup URL | `<tu-dominio>/conexiones` |
   | Redirect on update | **Marcado** |
   | Webhook → Active | **Sin marcar** |

3. En **Repository permissions** pon:
   - **Contents:** *Read and write*.
   - **Metadata:** *Read-only* (GitHub lo marca solo).
   No des ningún otro permiso.
4. En **Where can this GitHub App be installed?** elige:
   - **Only on this account** si solo tú usarás la app.
   - **Any account** si otras personas iniciarán sesión con su propia cuenta de GitHub (ellas instalarán la App en sus repositorios).
5. Toca **Create GitHub App**.
6. En la página de tu App anota:
   - **App ID** (número, arriba en *About*). Lo necesitas solo para el conector de Claude.
   - **Client ID** (empieza con `Iv`).
   - El **slug**: es la última parte de la URL pública de tu App, `https://github.com/apps/<slug>`. Si el nombre es `Memorias Obsidian de ana`, el slug será parecido a `memorias-obsidian-de-ana`.
7. En el menú de la izquierda entra a **Credentials → Client secrets → New secret**. Copia el valor **en ese momento**: GitHub no lo vuelve a mostrar.

Para probar la app en tu computador (paso 12) agrega también, en la misma App, una segunda Callback URL: `http://localhost:3000/api/auth/github/callback`. GitHub permite hasta 10.

## Paso 6. Cargar las variables de entorno en Vercel

En tu proyecto de Vercel: **Settings → Environment Variables**. Agrega estas variables en el entorno **Production** (puedes marcar *Sensitive* en las que son secretas):

| Variable | Valor |
|---|---|
| `GITHUB_APP_CLIENT_ID` | El Client ID de tu GitHub App |
| `GITHUB_APP_CLIENT_SECRET` | El Client secret que generaste |
| `GITHUB_APP_SLUG` | El slug de tu App |
| `DATABASE_URL` | La cadena de conexión de Neon |
| `AUTH_SECRET` | Una clave aleatoria (ver abajo) |
| `REGISTRATION_MODE` | `allowlist` |
| `ALLOWED_GITHUB_USERS` | Tu usuario de GitHub (si son varios, separados por coma) |

Para generar una clave aleatoria, en una terminal con Node.js:

```
node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"
```

Copia el resultado y úsalo como `AUTH_SECRET`.

Sobre el acceso: con `REGISTRATION_MODE=allowlist` solo pueden entrar los usuarios de `ALLOWED_GITHUB_USERS`. Con `open`, cualquier persona con cuenta de GitHub podría registrarse en tu app, así que no lo uses salvo que sea lo que quieres.

Las variables del conector de Claude (`GITHUB_APP_ID`, `GITHUB_APP_PRIVATE_KEY`, `MCP_SIGNING_SECRET`) se agregan después, en el paso 10.

## Paso 7. Crear las tablas de la base de datos

Vercel no ejecuta las migraciones por ti. Se hace una vez desde tu computador:

1. Clona tu fork y entra a la carpeta:

   ```
   git clone https://github.com/<tu-usuario>/memorias-obsidian.git
   cd memorias-obsidian
   npm install
   ```

2. Crea un archivo `.env.local` (no se sube a GitHub) con una sola línea:

   ```
   DATABASE_URL=<la cadena de conexión de Neon>
   ```

3. Aplica las migraciones:

   ```
   npm run db:desplegar
   ```

   Debe terminar diciendo que las migraciones se aplicaron.

Cuando una actualización del proyecto incluya cambios de esquema, repite solo el paso 3 antes de desplegar.

## Paso 8. Volver a desplegar y entrar por primera vez

1. En Vercel: **Deployments →** el último despliegue → **⋯ → Redeploy**. Las variables nuevas solo se aplican a despliegues nuevos.
2. Cuando diga **Ready**, abre `<tu-dominio>`. Debes ver la pantalla de inicio de sesión.
3. Toca **Continuar con GitHub** y autoriza.
4. Ya dentro, la app te lleva a **Conexiones**. Ahí:
   1. En «1. Instalar la GitHub App» toca **Instalar en GitHub**. GitHub te pregunta en qué repositorios: elige **solo el repositorio de tu vault**.
   2. De vuelta en Conexiones, elige el repositorio, la rama (normalmente `main`) y, si tu vault está dentro de una subcarpeta del repositorio, la subcarpeta base.
   3. En «3. Probar la conexión» toca **Probar conexión** y, si sale bien, **Guardar vault**.
5. La app te pregunta si quieres **descargar el vault**. Acepta: la primera vez tarda un poco, después solo trae lo que cambió.

Si todo salió bien, ya puedes abrir tus notas.

## Paso 9. Sincronizar con Obsidian en el computador

La app guarda sus cambios como commits en tu repositorio. Para verlos en Obsidian y para que lo que escribes en el computador llegue a la app, usa el plugin **Git**:

1. En Obsidian: **Ajustes → Complementos de la comunidad → Explorar**, busca **Git** (autor *Vinzent*, millones de descargas), instálalo y **habilítalo**.
2. Comprueba que el vault está conectado a tu repositorio: `Ctrl + P` (o `Cmd + P`) → **Git: Edit remotes**. Debe aparecer `origin` apuntando a tu repositorio.
3. Ajustes → **Git → Automatic**:
   - **Auto pull interval (minutes):** `5`
   - **Auto push interval (minutes):** `5`
   - **Pull on startup:** activado

   Después de escribir cada número presiona Enter o haz clic fuera del campo para que se guarde, y vuelve a abrir la pantalla para comprobar que los valores siguen ahí.
4. Comandos útiles (`Ctrl + P`):
   - **Git: Pull**: trae lo que se guardó desde la app.
   - **Git: Commit-and-sync**: guarda tus cambios locales, trae los de GitHub y sube los tuyos. Es lo más cómodo.
5. Lo que escribas en el computador aparece en la app tocando **Actualizar** en el menú ⋯.

Con Obsidian abierto y los intervalos activos, lo que guardas en el celular aparece en el computador en pocos minutos. Si Obsidian está cerrado, se baja al abrirlo.

Precaución: evita editar la misma nota en el celular y en el computador al mismo tiempo. Si ocurre, Git puede pedirte resolver un conflicto a mano.

## Paso 10. (Opcional) Conectar tu Claude

El conector permite que tu Claude busque, lea, cree notas y agregue texto al final de una nota, solo en tu vault. No puede borrar, renombrar, mover ni sobrescribir.

1. En tu GitHub App → **Credentials → Key pairs → Generate a private key**. Se descarga un archivo `.pem`. No lo subas a ningún repositorio ni lo pegues en chats.
2. En Vercel agrega tres variables más (entorno **Production**):

   | Variable | Valor |
   |---|---|
   | `GITHUB_APP_ID` | El App ID (número) de tu GitHub App |
   | `GITHUB_APP_PRIVATE_KEY` | El contenido completo del `.pem` (en el panel de Vercel se puede pegar tal cual; por terminal, escribe los saltos de línea como `\n`) |
   | `MCP_SIGNING_SECRET` | Otra clave aleatoria, generada igual que `AUTH_SECRET` |

3. **Redeploy** del proyecto en Vercel. Para comprobar que quedó bien, abre `<tu-dominio>/api/mcp`: debe responder un error 401 («necesita token»). Si responde 503, falta alguna de las tres variables o falta redeployar.
4. Borra el `.pem` de tu computador: ya está guardado en Vercel.
5. En la app: **Conexiones → pestaña Claude** copia la dirección del conector (`<tu-dominio>/api/mcp`).
6. En Claude: **Ajustes → Conectores → Agregar conector personalizado**, pega la dirección y ponle un nombre.
7. Claude abre la pantalla de consentimiento de tu app: inicia sesión con GitHub si te lo pide, elige **Solo lectura** o **Lectura y escritura** y toca **Autorizar**.

Los conectores personalizados dependen de tu plan de Claude y pueden requerir permisos de administrador en una organización. Las direcciones de retorno permitidas por defecto son las de claude.ai, claude.com y las locales de Claude Code; se pueden cambiar con la variable `MCP_ALLOWED_REDIRECT_URIS`.

Para quitar el acceso de un Claude: Conexiones → Claude → **Revocar**.

## Paso 11. Instalar la app en el iPhone

1. Abre `<tu-dominio>` en **Safari**.
2. Toca el botón **Compartir** → **Añadir a pantalla de inicio**.
3. Abre la app desde el nuevo icono: se ve a pantalla completa.
4. Con conexión, toca el menú ⋯ → **Actualizar** para descargar las notas. Después podrás leer, buscar y ver el grafo incluso en modo avión. Editar y subir adjuntos sí requiere conexión.

## Paso 12. (Opcional) Probar en tu computador

Para desarrollar o probar cambios antes de publicarlos:

1. Asegúrate de haber agregado la Callback URL `http://localhost:3000/api/auth/github/callback` a tu GitHub App (paso 5).
2. En tu carpeta del proyecto, completa `.env.local` con **todas** las variables de la tabla del paso 6 (puedes copiar `.env.example`).
3. Ejecuta:

   ```
   npm run dev
   ```

4. Abre http://localhost:3000.

El service worker (modo sin conexión) solo se activa en producción.

## Problemas frecuentes

| Qué ves | Qué hacer |
|---|---|
| Al iniciar sesión: «Tu cuenta de GitHub no está autorizada» | Agrega tu usuario a `ALLOWED_GITHUB_USERS` en Vercel y haz Redeploy. |
| GitHub dice «redirect_uri is not associated with this application» | La Callback URL de la GitHub App no coincide exactamente con tu dominio: revísala (sin barra final, con `https`, mismo dominio). |
| Al volver de GitHub aparece «La solicitud de acceso expiró o no es válida» | Entra siempre por el mismo dominio configurado y vuelve a intentar; no cambies entre `www` y sin `www`. |
| En Conexiones no aparece tu repositorio | Instala la GitHub App sobre ese repositorio (Conexiones → **Administrar instalación**, o github.com/settings/installations). |
| Error de base de datos al iniciar sesión | Revisa `DATABASE_URL` en Vercel y que ejecutaste `npm run db:desplegar` (paso 7). |
| Cambiaste una variable y nada cambia | Las variables nuevas solo aplican con un **Redeploy**. |
| Al autorizar Claude aparece un error 500 o `/api/mcp` responde 503 | Faltan `GITHUB_APP_ID`, `GITHUB_APP_PRIVATE_KEY` o `MCP_SIGNING_SECRET`, o falta redeployar. |
| Vercel falla con «An unexpected error occurred… transient issue» | Es un error pasajero de Vercel: repite el despliegue con Redeploy. |
| Obsidian no trae los cambios del celular | Ejecuta **Git: Commit-and-sync** y revisa que los intervalos de Automatic hayan quedado guardados (paso 9). |
| Una foto o archivo no se sube | El límite es de 4 MB por adjunto (por el límite de peticiones de Vercel); las imágenes se comprimen solas. |

## Seguridad y mantenimiento

- Nunca subas `.env.local`, contraseñas ni claves al repositorio. Ya está en `.gitignore`, pero revisa antes de cada commit.
- Si compartiste una credencial por error, **rótala**: en Neon (**Roles → Reset password**) y actualiza `DATABASE_URL`; en la GitHub App genera un nuevo Client secret, actualiza `GITHUB_APP_CLIENT_SECRET` y recién después borra el anterior.
- Mantén tu repositorio del vault **privado**.
- Para quitar tus datos de la app: menú ⋯ → **Cuenta y privacidad** → **Eliminar mi cuenta**. No borra tu repositorio ni desinstala la GitHub App.
- Más detalle técnico (conector, seguridad, PWA) en el [README](../README.md).
