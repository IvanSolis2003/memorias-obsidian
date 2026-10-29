import { createHash, randomBytes } from "node:crypto";
import { readFileSync } from "node:fs";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";

const [, , base, cookieA, cookieB, cookieIntruso, registro] = process.argv;
const resultados = [];
const comprobar = (nombre, ok, detalle = "") => resultados.push({ nombre, ok, detalle });
const lineas = (prefijo) => readFileSync(registro, "utf8").split("\n").filter((l) => l.startsWith(prefijo));
const CALLBACK = "https://claude.ai/api/mcp/auth_callback";

function pkce() {
  const verificador = randomBytes(32).toString("base64url");
  return { verificador, challenge: createHash("sha256").update(verificador).digest("base64url") };
}

async function registrar(redirect = CALLBACK, nombre = "Claude") {
  const r = await fetch(base + "/api/oauth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ client_name: nombre, redirect_uris: [redirect], token_endpoint_auth_method: "none" }),
  });
  return { estado: r.status, cuerpo: await r.json() };
}

function parametrosAutorizacion(clientId, redirect, challenge, state, scope = "read write") {
  const p = new URLSearchParams({ client_id: clientId, redirect_uri: redirect, response_type: "code", code_challenge: challenge, code_challenge_method: "S256", state, scope });
  return p;
}

async function aprobar(cookie, params, permiso, decision = "aprobar", origen = base) {
  const formulario = new URLSearchParams(params);
  formulario.set("permiso", permiso);
  formulario.set("decision", decision);
  return fetch(base + "/api/oauth/aprobar", {
    method: "POST",
    redirect: "manual",
    headers: { Cookie: `memorias_sesion=${cookie}`, "Content-Type": "application/x-www-form-urlencoded", ...(origen ? { Origin: origen } : {}) },
    body: formulario,
  });
}

async function token(parametros) {
  const r = await fetch(base + "/api/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(parametros),
  });
  return { estado: r.status, cuerpo: await r.json(), cabeceras: r.headers };
}

async function conectar(cookie, permiso, nombre = "Claude") {
  const cliente = (await registrar(CALLBACK, nombre)).cuerpo;
  const { verificador, challenge } = pkce();
  const params = parametrosAutorizacion(cliente.client_id, CALLBACK, challenge, "estado-123");
  const respuesta = await aprobar(cookie, params, permiso);
  const destino = new URL(respuesta.headers.get("location"));
  const codigo = destino.searchParams.get("code");
  const intercambio = await token({ grant_type: "authorization_code", code: codigo, redirect_uri: CALLBACK, client_id: cliente.client_id, code_verifier: verificador });
  return { cliente, codigo, verificador, destino, ...intercambio };
}

async function clienteMcp(accessToken) {
  const c = new Client({ name: "prueba", version: "1.0.0" });
  await c.connect(new StreamableHTTPClientTransport(new URL(base + "/api/mcp"), { requestInit: { headers: { Authorization: `Bearer ${accessToken}` } } }));
  return c;
}

const texto = (r) => r.content.map((c) => c.text).join("\n");

const recurso = await (await fetch(base + "/.well-known/oauth-protected-resource")).json();
comprobar("metadatos del recurso: resource es la URL del conector", recurso.resource === `${base}/api/mcp` && recurso.authorization_servers[0] === base, JSON.stringify(recurso));
const recursoSufijo = await (await fetch(base + "/.well-known/oauth-protected-resource/api/mcp")).json();
comprobar("metadatos del recurso también con sufijo de ruta", recursoSufijo.resource === `${base}/api/mcp`, "");
const servidor = await (await fetch(base + "/.well-known/oauth-authorization-server")).json();
comprobar("metadatos del servidor: DCR, S256 y cliente público", !!servidor.registration_endpoint && servidor.code_challenge_methods_supported.includes("S256") && servidor.token_endpoint_auth_methods_supported.includes("none"), JSON.stringify(servidor));

const sinToken = await fetch(base + "/api/mcp", { method: "POST", headers: { "Content-Type": "application/json", Accept: "application/json, text/event-stream" }, body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/list" }) });
comprobar("MCP sin token → 401 con resource_metadata", sinToken.status === 401 && (sinToken.headers.get("www-authenticate") ?? "").includes("resource_metadata="), `${sinToken.status} ${sinToken.headers.get("www-authenticate")}`);
const tokenFalso = await fetch(base + "/api/mcp", { method: "POST", headers: { Authorization: "Bearer abc.def.ghi", "Content-Type": "application/json" }, body: "{}" });
comprobar("MCP con token falso → 401 invalid_token", tokenFalso.status === 401 && (tokenFalso.headers.get("www-authenticate") ?? "").includes("invalid_token"), String(tokenFalso.status));

const registroMalo = await registrar("https://evil.example/callback");
comprobar("registro rechaza redirect no permitida", registroMalo.estado === 400, String(registroMalo.estado));
const registroLoopback = await registrar("http://localhost:3118/callback", "Claude Code");
comprobar("registro acepta loopback con puerto", registroLoopback.estado === 201, String(registroLoopback.estado));
const registroHttp = await registrar("http://claude.ai/api/mcp/auth_callback");
comprobar("registro rechaza http fuera de loopback", registroHttp.estado === 400, String(registroHttp.estado));

const cli = (await registrar()).cuerpo;
const { verificador: vPrueba, challenge: cPrueba } = pkce();
const params = parametrosAutorizacion(cli.client_id, CALLBACK, cPrueba, "e1");
const autorizar = await fetch(`${base}/api/oauth/authorize?${params}`, { redirect: "manual" });
comprobar("authorize válido redirige a la pantalla de consentimiento", autorizar.status === 303 && (autorizar.headers.get("location") ?? "").includes("/autorizar?"), `${autorizar.status} ${autorizar.headers.get("location")}`);
const malRedirect = await fetch(`${base}/api/oauth/authorize?${parametrosAutorizacion(cli.client_id, "https://evil.example/cb", cPrueba, "e1")}`, { redirect: "manual" });
comprobar("authorize con redirect no registrada → 400 sin redirigir", malRedirect.status === 400, String(malRedirect.status));
const sinPkce = await fetch(`${base}/api/oauth/authorize?client_id=${cli.client_id}&redirect_uri=${encodeURIComponent(CALLBACK)}&response_type=code&state=x`, { redirect: "manual" });
comprobar("authorize sin PKCE redirige con invalid_request", sinPkce.status === 303 && (sinPkce.headers.get("location") ?? "").includes("error=invalid_request"), `${sinPkce.status} ${sinPkce.headers.get("location")}`);
const clienteInexistente = await fetch(`${base}/api/oauth/authorize?${parametrosAutorizacion("mcp_noexiste", CALLBACK, cPrueba, "e1")}`, { redirect: "manual" });
comprobar("authorize con cliente inexistente → 400", clienteInexistente.status === 400, String(clienteInexistente.status));

const consentimientoSinSesion = await fetch(`${base}/autorizar?${params}`, { redirect: "manual" });
comprobar("/autorizar sin sesión → login con volver", consentimientoSinSesion.status === 307 && (consentimientoSinSesion.headers.get("location") ?? "").includes("volver="), `${consentimientoSinSesion.status} ${consentimientoSinSesion.headers.get("location")}`);
const consentimiento = await fetch(`${base}/autorizar?${params}`, { headers: { Cookie: `memorias_sesion=${cookieA}` } });
const html = (await consentimiento.text()).replace(/<!-- -->/g, "");
comprobar("pantalla de consentimiento en español con vault, permisos y destino", consentimiento.status === 200 && html.includes("Conectar con Claude") && html.includes("userA/vault-a") && html.includes("Solo lectura") && html.includes("claude.ai"), String(consentimiento.status));
const loginConVolver = await (await fetch(`${base}/login?volver=${encodeURIComponent("/autorizar?x=1")}`)).text();
comprobar("login conserva el retorno a /autorizar", loginConVolver.includes("volver=%2Fautorizar%3Fx%3D1") || loginConVolver.includes("volver=%2Fautorizar"), "");
const loginMalicioso = await (await fetch(`${base}/login?volver=${encodeURIComponent("https://evil.example")}`)).text();
comprobar("login ignora retornos externos", loginMalicioso.includes('href="/api/auth/github/login"'), "");

const sinOrigen = await aprobar(cookieA, params, "read", "aprobar", null);
comprobar("aprobar sin Origin → 403", sinOrigen.status === 403, String(sinOrigen.status));
const origenAjeno = await aprobar(cookieA, params, "read", "aprobar", "https://evil.example");
comprobar("aprobar con Origin ajeno → 403", origenAjeno.status === 403, String(origenAjeno.status));
const sinSesionAprobar = await fetch(base + "/api/oauth/aprobar", { method: "POST", redirect: "manual", headers: { Origin: base }, body: new URLSearchParams(params) });
comprobar("aprobar sin sesión → 401", sinSesionAprobar.status === 401, String(sinSesionAprobar.status));
const intruso = await aprobar(cookieIntruso, params, "write");
comprobar("cuenta fuera de la allowlist no puede aprobar", intruso.status === 401, String(intruso.status));
const cancelada = await aprobar(cookieA, params, "read", "cancelar");
comprobar("cancelar devuelve access_denied con state", (cancelada.headers.get("location") ?? "").includes("error=access_denied") && (cancelada.headers.get("location") ?? "").includes("state=e1"), cancelada.headers.get("location") ?? "");

const aprobada = await aprobar(cookieA, params, "write");
const destinoAprobada = new URL(aprobada.headers.get("location") ?? "http://x");
const codigo = destinoAprobada.searchParams.get("code");
comprobar("aprobar redirige al callback con code y state", aprobada.status === 303 && destinoAprobada.origin + destinoAprobada.pathname === CALLBACK && !!codigo && destinoAprobada.searchParams.get("state") === "e1", aprobada.headers.get("location") ?? "");

const verifMalo = await token({ grant_type: "authorization_code", code: codigo, redirect_uri: CALLBACK, client_id: cli.client_id, code_verifier: pkce().verificador });
comprobar("token con verificador PKCE incorrecto → invalid_grant", verifMalo.estado === 400 && verifMalo.cuerpo.error === "invalid_grant", JSON.stringify(verifMalo.cuerpo));
const clienteOtro = await token({ grant_type: "authorization_code", code: codigo, redirect_uri: CALLBACK, client_id: "mcp_otro", code_verifier: vPrueba });
comprobar("token con otro client_id → invalid_grant", clienteOtro.cuerpo.error === "invalid_grant", JSON.stringify(clienteOtro.cuerpo));
const redirectOtra = await token({ grant_type: "authorization_code", code: codigo, redirect_uri: "https://claude.com/api/mcp/auth_callback", client_id: cli.client_id, code_verifier: vPrueba });
comprobar("token con otra redirect_uri → invalid_grant", redirectOtra.cuerpo.error === "invalid_grant", "");
const buena = await token({ grant_type: "authorization_code", code: codigo, redirect_uri: CALLBACK, client_id: cli.client_id, code_verifier: vPrueba });
comprobar("token canjea el código y devuelve access y refresh", buena.estado === 200 && buena.cuerpo.token_type === "Bearer" && !!buena.cuerpo.access_token && !!buena.cuerpo.refresh_token && buena.cuerpo.expires_in === 3600 && buena.cuerpo.scope === "read write", JSON.stringify(buena.cuerpo).slice(0, 120));
comprobar("token no se cachea", (buena.cabeceras.get("cache-control") ?? "").includes("no-store"), "");
const repetido = await token({ grant_type: "authorization_code", code: codigo, redirect_uri: CALLBACK, client_id: cli.client_id, code_verifier: vPrueba });
comprobar("un código no se puede usar dos veces", repetido.cuerpo.error === "invalid_grant", JSON.stringify(repetido.cuerpo));
const tipoMalo = await token({ grant_type: "client_credentials" });
comprobar("grant_type no soportado → unsupported_grant_type", tipoMalo.cuerpo.error === "unsupported_grant_type", "");

const A = buena.cuerpo;
const mcpA = await clienteMcp(A.access_token);
const herramientas = (await mcpA.listTools()).tools.map((t) => t.name).sort();
comprobar("solo existen las 5 herramientas previstas", JSON.stringify(herramientas) === JSON.stringify(["agregar_a_nota", "buscar_notas", "crear_nota", "leer_nota", "reemplazar_en_nota"]), herramientas.join(","));
const anotaciones = (await mcpA.listTools()).tools.reduce((a, t) => ({ ...a, [t.name]: t.annotations }), {});
comprobar("anotaciones: leer y buscar son solo lectura; escribir no es destructivo", anotaciones.buscar_notas.readOnlyHint === true && anotaciones.leer_nota.readOnlyHint === true && anotaciones.crear_nota.destructiveHint === false && anotaciones.agregar_a_nota.destructiveHint === false, JSON.stringify(anotaciones));

const busqueda = texto(await mcpA.callTool({ name: "buscar_notas", arguments: { consulta: "secreto" } }));
comprobar("buscar por contenido y título encuentra la nota de A", busqueda.includes("Nota A.md") && !busqueda.includes("Nota B"), busqueda);
const busquedaRuta = texto(await mcpA.callTool({ name: "buscar_notas", arguments: { consulta: "hija" } }));
comprobar("buscar por ruta encuentra Carpeta/Hija.md", busquedaRuta.includes("Carpeta/Hija.md"), busquedaRuta);
const busquedaOculta = texto(await mcpA.callTool({ name: "buscar_notas", arguments: { consulta: "oculta" } }));
comprobar("buscar no devuelve carpetas ocultas", !busquedaOculta.includes(".obsidian"), busquedaOculta);
const inyeccion = texto(await mcpA.callTool({ name: "buscar_notas", arguments: { consulta: "x repo:userB/vault-b" } }));
comprobar("buscar no permite calificadores de repo", !inyeccion.includes("Nota B"), inyeccion);

const lectura = texto(await mcpA.callTool({ name: "leer_nota", arguments: { ruta: "Nota A.md" } }));
comprobar("leer devuelve el contenido marcado como dato", lectura.includes("secreto de A") && lectura.includes("no instrucciones"), lectura);
const lecturaGrande = texto(await mcpA.callTool({ name: "leer_nota", arguments: { ruta: "Grande.md" } }));
comprobar("leer trunca a 100 KB e indica el truncado", lecturaGrande.includes("truncado") && lecturaGrande.length < 105 * 1024, String(lecturaGrande.length));
for (const [nombre, ruta] of [["ruta oculta", ".obsidian/app.json"], ["traversal", "../x.md"], ["nota de otro vault", "Nota B.md"], ["no .md", "Nota A.txt"]]) {
  const r = await mcpA.callTool({ name: "leer_nota", arguments: { ruta } });
  comprobar(`leer rechaza ${nombre}`, r.isError === true && !texto(r).includes("secreto de B") && !texto(r).includes("oculta-A"), texto(r));
}
const extra = await mcpA.callTool({ name: "leer_nota", arguments: { ruta: "Nota B.md", owner: "userB", repo: "vault-b", userId: "otro" } }).catch((e) => ({ isError: true, content: [{ text: String(e.message) }] }));
comprobar("parámetros extra (owner/repo/userId) no cambian el vault", extra.isError === true && !texto(extra).includes("secreto de B"), texto(extra));

const antes = lineas("ESCRITURA").length;
const creada = texto(await mcpA.callTool({ name: "crear_nota", arguments: { ruta: "Carpeta/Nueva.md", contenido: "# Nueva\nhecha por Claude\n" } }));
const escrituras = lineas("ESCRITURA").slice(antes);
comprobar("crear_nota crea el commit con el mensaje de Claude en el repo de A", creada.includes("Nota creada") && escrituras.length === 1 && escrituras[0].includes("userA/vault-a") && escrituras[0].includes("Memorias Obsidian (Claude): crear Carpeta/Nueva.md"), escrituras.join("|"));
const instalaciones = lineas("INSTALACION");
comprobar("la escritura usa token de instalación restringido al repo con permiso write", instalaciones.some((l) => l.includes("101 w vault-a")), instalaciones.join("|"));
const duplicada = await mcpA.callTool({ name: "crear_nota", arguments: { ruta: "Carpeta/Nueva.md", contenido: "otra" } });
comprobar("crear_nota no sobrescribe una nota existente", duplicada.isError === true && texto(duplicada).includes("Ya existe"), texto(duplicada));
const sinCarpeta = await mcpA.callTool({ name: "crear_nota", arguments: { ruta: "NoExiste/x.md", contenido: "x" } });
comprobar("crear_nota por defecto exige que la carpeta exista y explica cómo crearla", sinCarpeta.isError === true && texto(sinCarpeta).includes("no existe") && texto(sinCarpeta).includes("crear_carpeta") && !lineas("ESCRITURA").some((l) => l.includes("NoExiste/x.md")), texto(sinCarpeta));
const conCarpeta = texto(await mcpA.callTool({ name: "crear_nota", arguments: { ruta: "Proyectos Nuevos/Sub Carpeta/Primera.md", contenido: "# Primera\n", crear_carpeta: true } }));
comprobar("crear_nota con crear_carpeta crea la carpeta anidada junto con la nota", conCarpeta.includes("Nota creada") && lineas("ESCRITURA").some((l) => l.includes("userA/vault-a Proyectos Nuevos/Sub Carpeta/Primera.md | Memorias Obsidian (Claude): crear")), conCarpeta);
const conCarpetaDuplicada = await mcpA.callTool({ name: "crear_nota", arguments: { ruta: "Proyectos Nuevos/Sub Carpeta/Primera.md", contenido: "otra", crear_carpeta: true } });
comprobar("crear_carpeta no permite sobrescribir una nota existente", conCarpetaDuplicada.isError === true && texto(conCarpetaDuplicada).includes("Ya existe"), texto(conCarpetaDuplicada));
const carpetaOculta = await mcpA.callTool({ name: "crear_nota", arguments: { ruta: ".obsidian/nuevo/x.md", contenido: "x", crear_carpeta: true } });
comprobar("crear_carpeta no abre carpetas ocultas", carpetaOculta.isError === true && !lineas("ESCRITURA").some((l) => l.includes(".obsidian/nuevo")), texto(carpetaOculta));
const carpetaTraversal = await mcpA.callTool({ name: "crear_nota", arguments: { ruta: "../afuera/x.md", contenido: "x", crear_carpeta: true } });
comprobar("crear_carpeta no permite salir del vault con ..", carpetaTraversal.isError === true && !lineas("ESCRITURA").some((l) => l.includes("afuera")), texto(carpetaTraversal));
const carpetaExistente = texto(await mcpA.callTool({ name: "crear_nota", arguments: { ruta: "Carpeta/Otra.md", contenido: "o", crear_carpeta: true } }));
comprobar("crear_carpeta sobre una carpeta que ya existe funciona igual", carpetaExistente.includes("Nota creada"), carpetaExistente);
const enOculta = await mcpA.callTool({ name: "crear_nota", arguments: { ruta: ".obsidian/x.md", contenido: "x" } });
comprobar("crear_nota rechaza carpetas ocultas", enOculta.isError === true, texto(enOculta));
const noMd = await mcpA.callTool({ name: "crear_nota", arguments: { ruta: "x.txt", contenido: "x" } });
comprobar("crear_nota exige .md", noMd.isError === true, texto(noMd));
const grande = await mcpA.callTool({ name: "crear_nota", arguments: { ruta: "Grande2.md", contenido: "a".repeat(1024 * 1024 + 10) } }).catch((e) => ({ isError: true, content: [{ text: String(e.message) }] }));
comprobar("crear_nota rechaza más de 1 MB", grande.isError === true, texto(grande).slice(0, 80));

const agregada = texto(await mcpA.callTool({ name: "agregar_a_nota", arguments: { ruta: "Nota A.md", texto: "- línea agregada por Claude" } }));
const leida = texto(await mcpA.callTool({ name: "leer_nota", arguments: { ruta: "Nota A.md" } }));
comprobar("agregar_a_nota agrega al final y conserva lo anterior", agregada.includes("agregado") && leida.includes("secreto de A") && leida.trim().endsWith("- línea agregada por Claude"), leida);
comprobar("el commit de agregar lleva el mensaje de Claude", lineas("ESCRITURA").some((l) => l.includes("Memorias Obsidian (Claude): agregar a Nota A.md")), "");
const agregarInexistente = await mcpA.callTool({ name: "agregar_a_nota", arguments: { ruta: "NoHay.md", texto: "x" } });
comprobar("agregar_a_nota falla si la nota no existe (no la crea)", agregarInexistente.isError === true && !lineas("ESCRITURA").some((l) => l.includes("NoHay.md")), texto(agregarInexistente));

const reemplazada = texto(await mcpA.callTool({ name: "reemplazar_en_nota", arguments: { ruta: "Nota A.md", buscar: "secreto de A", reemplazo: "dato de A" } }));
const tras1 = texto(await mcpA.callTool({ name: "leer_nota", arguments: { ruta: "Nota A.md" } }));
comprobar("reemplazar_en_nota cambia solo el fragmento y conserva el resto", reemplazada.includes("reemplazado") && tras1.includes("dato de A [[Carpeta/Hija]]") && tras1.includes("- línea agregada por Claude") && !tras1.includes("secreto de A"), tras1);
comprobar("el commit de reemplazar lleva el mensaje de Claude", lineas("ESCRITURA").some((l) => l.includes("userA/vault-a Nota A.md | Memorias Obsidian (Claude): editar Nota A.md")), "");
const escrBusquedaFalla = lineas("ESCRITURA").length;
const noEncontrado = await mcpA.callTool({ name: "reemplazar_en_nota", arguments: { ruta: "Nota A.md", buscar: "texto inexistente", reemplazo: "x" } });
comprobar("reemplazar_en_nota falla si el fragmento no existe y no escribe", noEncontrado.isError === true && texto(noEncontrado).includes("No se encontró") && lineas("ESCRITURA").length === escrBusquedaFalla, texto(noEncontrado));
await mcpA.callTool({ name: "crear_nota", arguments: { ruta: "Repetida.md", contenido: "x\nx\n" } });
const escrAntesRepetida = lineas("ESCRITURA").length;
const repetida = await mcpA.callTool({ name: "reemplazar_en_nota", arguments: { ruta: "Repetida.md", buscar: "x", reemplazo: "y" } });
comprobar("reemplazar_en_nota rechaza fragmentos repetidos y no escribe", repetida.isError === true && texto(repetida).includes("2 veces") && lineas("ESCRITURA").length === escrAntesRepetida, texto(repetida));
const vacio = await mcpA.callTool({ name: "reemplazar_en_nota", arguments: { ruta: "Nota A.md", buscar: "   ", reemplazo: "x" } });
comprobar("reemplazar_en_nota rechaza buscar vacío", vacio.isError === true, texto(vacio));
const borrada = texto(await mcpA.callTool({ name: "reemplazar_en_nota", arguments: { ruta: "Nota A.md", buscar: "- línea agregada por Claude\n", reemplazo: "" } }));
const tras2 = texto(await mcpA.callTool({ name: "leer_nota", arguments: { ruta: "Nota A.md" } }));
comprobar("reemplazar_en_nota con reemplazo vacío borra el fragmento", borrada.includes("reemplazado") && !tras2.includes("línea agregada") && tras2.includes("dato de A"), tras2);
await mcpA.callTool({ name: "reemplazar_en_nota", arguments: { ruta: "Nota A.md", buscar: "dato de A", reemplazo: "costo $& y $1 literal" } });
const tras3 = texto(await mcpA.callTool({ name: "leer_nota", arguments: { ruta: "Nota A.md" } }));
comprobar("reemplazar_en_nota trata $& y $1 como texto literal", tras3.includes("costo $& y $1 literal [[Carpeta/Hija]]"), tras3);
const crlf = texto(await mcpA.callTool({ name: "reemplazar_en_nota", arguments: { ruta: "Windows.md", buscar: "uno\ndos", reemplazo: "UNO\nDOS" } }));
const trasCrlf = texto(await mcpA.callTool({ name: "leer_nota", arguments: { ruta: "Windows.md" } }));
comprobar("reemplazar_en_nota respeta notas con saltos CRLF", crlf.includes("reemplazado") && trasCrlf.includes("UNO\r\nDOS\r\ntres\r\n") && !trasCrlf.includes("UNO\nDOS"), JSON.stringify(trasCrlf));
const escrAntesAjena = lineas("ESCRITURA").length;
const ajena = await mcpA.callTool({ name: "reemplazar_en_nota", arguments: { ruta: "Nota B.md", buscar: "secreto de B", reemplazo: "hackeado" } });
comprobar("reemplazar_en_nota no toca notas de otro vault", ajena.isError === true && lineas("ESCRITURA").length === escrAntesAjena, texto(ajena));
const oculta = await mcpA.callTool({ name: "reemplazar_en_nota", arguments: { ruta: ".obsidian/app.json", buscar: "oculta-A", reemplazo: "x" } });
comprobar("reemplazar_en_nota rechaza rutas ocultas y no .md", oculta.isError === true && lineas("ESCRITURA").length === escrAntesAjena, texto(oculta));

const refrescado = await token({ grant_type: "refresh_token", refresh_token: A.refresh_token, client_id: cli.client_id });
comprobar("refresh entrega tokens nuevos y rota el refresh", refrescado.estado === 200 && refrescado.cuerpo.refresh_token !== A.refresh_token, JSON.stringify(refrescado.cuerpo).slice(0, 100));
const refreshViejo = await token({ grant_type: "refresh_token", refresh_token: A.refresh_token, client_id: cli.client_id });
comprobar("el refresh anterior deja de servir", refreshViejo.cuerpo.error === "invalid_grant", JSON.stringify(refreshViejo.cuerpo));
const refreshOtroCliente = await token({ grant_type: "refresh_token", refresh_token: refrescado.cuerpo.refresh_token, client_id: "mcp_otro" });
comprobar("refresh con otro client_id → invalid_grant", refreshOtroCliente.cuerpo.error === "invalid_grant", "");

const B = await conectar(cookieB, "write", "Claude de B");
comprobar("B conecta su propio Claude", B.estado === 200, JSON.stringify(B.cuerpo).slice(0, 80));
const mcpB = await clienteMcp(B.cuerpo.access_token);
const busquedaB = texto(await mcpB.callTool({ name: "buscar_notas", arguments: { consulta: "secreto" } }));
comprobar("B solo ve su vault al buscar", busquedaB.includes("Nota B.md") && !busquedaB.includes("Nota A.md"), busquedaB);
const cruzadaB = await mcpB.callTool({ name: "leer_nota", arguments: { ruta: "Nota A.md" } });
comprobar("el token de B no lee notas de A", cruzadaB.isError === true && !texto(cruzadaB).includes("secreto de A"), texto(cruzadaB));
const cruzadaA = await mcpA.callTool({ name: "leer_nota", arguments: { ruta: "Nota B.md" } }).catch(() => ({ isError: true, content: [{ text: "token anterior" }] }));
comprobar("el token de A no lee notas de B", cruzadaA.isError === true && !texto(cruzadaA).includes("secreto de B"), texto(cruzadaA));
const escrituraB = texto(await mcpB.callTool({ name: "crear_nota", arguments: { ruta: "DeB.md", contenido: "b" } }));
comprobar("lo que crea B queda en el repo de B", lineas("ESCRITURA").some((l) => l.includes("userB/vault-b DeB.md")) && escrituraB.includes("creada"), "");

const lectura2 = await conectar(cookieA, "read", "Claude solo lectura");
const mcpLectura = await clienteMcp(lectura2.cuerpo.access_token);
const antesLectura = lineas("ESCRITURA").length;
const rechazoEscritura = await mcpLectura.callTool({ name: "crear_nota", arguments: { ruta: "Bloqueada.md", contenido: "x" } });
const rechazoAgregar = await mcpLectura.callTool({ name: "agregar_a_nota", arguments: { ruta: "Nota A.md", texto: "x" } });
const rechazoReemplazar = await mcpLectura.callTool({ name: "reemplazar_en_nota", arguments: { ruta: "Nota A.md", buscar: "costo", reemplazo: "x" } });
const rechazoCarpeta = await mcpLectura.callTool({ name: "crear_nota", arguments: { ruta: "Carpeta Bloqueada/x.md", contenido: "x", crear_carpeta: true } });
comprobar("con solo lectura las herramientas de escritura se rechazan", rechazoEscritura.isError && rechazoAgregar.isError && rechazoReemplazar.isError && rechazoCarpeta.isError && texto(rechazoEscritura).includes("solo lectura") && texto(rechazoReemplazar).includes("solo lectura") && lineas("ESCRITURA").length === antesLectura, texto(rechazoEscritura));
comprobar("con solo lectura el scope emitido es read", lectura2.cuerpo.scope === "read", lectura2.cuerpo.scope);
const lecturaPermitida = texto(await mcpLectura.callTool({ name: "leer_nota", arguments: { ruta: "Nota A.md" } }));
comprobar("con solo lectura se puede leer", lecturaPermitida.includes("[[Carpeta/Hija]]"), "");
comprobar("el token de solo lectura usa token de instalación read", lineas("INSTALACION").some((l) => l.includes("101 r vault-a")), "");

const panelA = await (await fetch(base + "/api/connections", { headers: { Cookie: `memorias_sesion=${cookieA}` } })).json();
comprobar("panel: A ve sus 2 conexiones con permisos y uso", panelA.conexiones.length === 2 && panelA.conexiones.some((c) => c.escritura) && panelA.conexiones.some((c) => !c.escritura) && panelA.conexiones.every((c) => c.ultimoUso), JSON.stringify(panelA.conexiones).slice(0, 200));
comprobar("panel: actividad de Claude con creaciones y agregados", panelA.actividad.some((x) => x.accion === "crear" && x.ruta === "Carpeta/Nueva.md") && panelA.actividad.some((x) => x.accion === "agregar") && panelA.actividad.some((x) => x.accion === "guardar" && x.ruta === "Nota A.md") && panelA.actividad.length <= 20, JSON.stringify(panelA.actividad).slice(0, 200));
const panelB = await (await fetch(base + "/api/connections", { headers: { Cookie: `memorias_sesion=${cookieB}` } })).json();
comprobar("panel: B no ve las conexiones de A", panelB.conexiones.length === 1 && panelB.conexiones[0].cliente === "Claude de B", JSON.stringify(panelB.conexiones));
const idGrantA = panelA.conexiones.find((c) => c.escritura).id;
const revocarAjeno = await fetch(base + "/api/connections", { method: "DELETE", headers: { Origin: base, Cookie: `memorias_sesion=${cookieB}`, "Content-Type": "application/json" }, body: JSON.stringify({ id: idGrantA }) });
comprobar("B no puede revocar la conexión de A", revocarAjeno.status === 404, String(revocarAjeno.status));
const sigueA = texto(await mcpA.callTool({ name: "leer_nota", arguments: { ruta: "Nota A.md" } }).catch(() => ({ content: [{ text: "falló" }] })));
comprobar("la conexión de A sigue funcionando tras el intento de B", sigueA.includes("[[Carpeta/Hija]]"), sigueA);
const sinSesionPanel = await fetch(base + "/api/connections");
comprobar("panel sin sesión → 401", sinSesionPanel.status === 401, String(sinSesionPanel.status));

const revocar = await fetch(base + "/api/connections", { method: "DELETE", headers: { Origin: base, Cookie: `memorias_sesion=${cookieA}`, "Content-Type": "application/json" }, body: JSON.stringify({ id: idGrantA }) });
comprobar("A revoca su conexión", revocar.status === 200, String(revocar.status));
const tokenRevocado = await fetch(base + "/api/mcp", { method: "POST", headers: { Authorization: `Bearer ${refrescado.cuerpo.access_token}`, "Content-Type": "application/json", Accept: "application/json, text/event-stream" }, body: JSON.stringify({ jsonrpc: "2.0", id: 9, method: "tools/list" }) });
comprobar("el access token revocado deja de funcionar de inmediato", tokenRevocado.status === 401, String(tokenRevocado.status));
const refreshRevocado = await token({ grant_type: "refresh_token", refresh_token: refrescado.cuerpo.refresh_token, client_id: cli.client_id });
comprobar("el refresh token revocado deja de funcionar", refreshRevocado.cuerpo.error === "invalid_grant", JSON.stringify(refreshRevocado.cuerpo));
const otraConexionSigue = texto(await mcpLectura.callTool({ name: "leer_nota", arguments: { ruta: "Nota A.md" } }));
comprobar("revocar una conexión no afecta a las otras", otraConexionSigue.includes("[[Carpeta/Hija]]"), "");

const nueva = await conectar(cookieA, "write", "Claude límite");
const mcpLimite = await clienteMcp(nueva.cuerpo.access_token);
let bloqueada = null;
let hechas = 0;
for (let i = 0; i < 40; i++) {
  const r = await mcpLimite.callTool({ name: "agregar_a_nota", arguments: { ruta: "Nota A.md", texto: `línea ${i}` } });
  if (r.isError) {
    bloqueada = texto(r);
    break;
  }
  hechas++;
}
comprobar("límite de 30 escrituras por hora por usuario", bloqueada !== null && bloqueada.includes("límite") && hechas >= 10 && hechas < 30, `hechas ${hechas}: ${bloqueada}`);

const fallos = resultados.filter((r) => !r.ok);
for (const r of resultados) console.log(`${r.ok ? "OK   " : "FALLA"} ${r.nombre}${r.ok ? "" : "  → " + r.detalle}`);
console.log(`\n${resultados.length - fallos.length}/${resultados.length} comprobaciones correctas`);
process.exit(fallos.length ? 1 : 0);
