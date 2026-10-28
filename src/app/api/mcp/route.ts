import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { type NextRequest } from "next/server";
import { autenticarMcp } from "@/lib/mcp/autenticacion";
import { crearServidorMcp } from "@/lib/mcp/servidor";

export const dynamic = "force-dynamic";

async function manejar(request: NextRequest) {
  const contexto = await autenticarMcp(request);
  if (!("userId" in contexto)) return contexto;

  const transporte = new WebStandardStreamableHTTPServerTransport({ enableJsonResponse: true });
  await crearServidorMcp(contexto).connect(transporte);
  return transporte.handleRequest(request);
}

export { manejar as GET, manejar as POST, manejar as DELETE };
