import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { createOAuthState, OAUTH_STATE_COOKIE } from "@/lib/oauth-state";

export async function GET(request: Request) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const clientId = process.env.META_CLIENT_ID;

  const configId = process.env.META_LOGIN_CONFIG_ID;

  const redirectUri =
    process.env.META_REDIRECT_URI ||
    `${process.env.APP_URL}/api/oauth/facebook/callback`;

  if (!clientId || !configId) {
    return NextResponse.redirect(
      new URL("/accounts?oauth_error=meta_not_configured", request.url),
    );
  }

  const state = createOAuthState(session.user.id, "facebook");

  const authorizationUrl = new URL(
    "https://www.facebook.com/v24.0/dialog/oauth",
  );

  authorizationUrl.searchParams.set("client_id", clientId.trim());

  authorizationUrl.searchParams.set("redirect_uri", redirectUri.trim());

  authorizationUrl.searchParams.set("config_id", configId.trim());

  authorizationUrl.searchParams.set("response_type", "code");

  authorizationUrl.searchParams.set("state", state);

  const response = NextResponse.redirect(authorizationUrl);

  response.cookies.set(OAUTH_STATE_COOKIE, state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/api/oauth",
    maxAge: 10 * 60,
  });

  return response;
}
