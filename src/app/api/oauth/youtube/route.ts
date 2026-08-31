import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";

import {
  createOAuthState,
  OAUTH_STATE_COOKIE,
} from "@/lib/oauth-state";

import {
  YOUTUBE_SCOPES,
} from "@/services/youtube/youtube";

export async function GET(request: Request) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.redirect(
      new URL("/login", request.url),
    );
  }

  const clientId =
    process.env.YOUTUBE_CLIENT_ID;

  const redirectUri =
    process.env.YOUTUBE_REDIRECT_URI ||
    `${process.env.APP_URL}/api/oauth/youtube/callback`;

  if (!clientId) {
    return NextResponse.redirect(
      new URL(
        "/accounts?oauth_error=youtube_not_configured",
        request.url,
      ),
    );
  }

  const state = createOAuthState(
    session.user.id,
    "youtube",
  );

  const authorizationUrl = new URL(
    "https://accounts.google.com/o/oauth2/v2/auth",
  );

  authorizationUrl.searchParams.set(
    "client_id",
    clientId,
  );

  authorizationUrl.searchParams.set(
    "redirect_uri",
    redirectUri,
  );

  authorizationUrl.searchParams.set(
    "response_type",
    "code",
  );

  authorizationUrl.searchParams.set(
    "scope",
    YOUTUBE_SCOPES.join(" "),
  );

  authorizationUrl.searchParams.set(
    "access_type",
    "offline",
  );

  authorizationUrl.searchParams.set(
    "prompt",
    "consent",
  );

  authorizationUrl.searchParams.set(
    "include_granted_scopes",
    "true",
  );

  authorizationUrl.searchParams.set(
    "state",
    state,
  );

  const response = NextResponse.redirect(
    authorizationUrl,
  );

  response.cookies.set(
    OAUTH_STATE_COOKIE,
    state,
    {
      httpOnly: true,
      secure:
        process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/api/oauth",
      maxAge: 10 * 60,
    },
  );

  return response;
}