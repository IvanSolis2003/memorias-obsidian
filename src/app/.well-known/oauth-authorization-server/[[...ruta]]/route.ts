import { NextResponse, type NextRequest } from "next/server";

export function GET(request: NextRequest) {
  const origen = request.nextUrl.origin;
  return NextResponse.json({
    issuer: origen,
    authorization_endpoint: `${origen}/api/oauth/authorize`,
    token_endpoint: `${origen}/api/oauth/token`,
    registration_endpoint: `${origen}/api/oauth/register`,
    response_types_supported: ["code"],
    grant_types_supported: ["authorization_code", "refresh_token"],
    code_challenge_methods_supported: ["S256"],
    token_endpoint_auth_methods_supported: ["none"],
    scopes_supported: ["read", "write", "offline_access"],
  });
}
