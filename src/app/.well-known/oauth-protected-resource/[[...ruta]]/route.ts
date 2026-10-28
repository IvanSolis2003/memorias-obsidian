import { NextResponse, type NextRequest } from "next/server";
import { urlDelRecurso } from "@/lib/mcp/tokens";

export function GET(request: NextRequest) {
  const origen = request.nextUrl.origin;
  return NextResponse.json({
    resource: urlDelRecurso(origen),
    authorization_servers: [origen],
    scopes_supported: ["read", "write"],
    bearer_methods_supported: ["header"],
    resource_name: "Memorias Ivan",
  });
}
