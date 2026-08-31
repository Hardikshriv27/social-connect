import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { encrypt } from "@/lib/encryption";

import {
  OAUTH_STATE_COOKIE,
  verifyOAuthState,
} from "@/lib/oauth-state";

import {
  exchangeYouTubeCode,
  getYouTubeChannel,
} from "@/services/youtube/youtube";

function redirectToAccounts(
  request: NextRequest,
  status: string,
) {
  const url = new URL("/accounts", request.url);
  url.searchParams.set("oauth", status);

  return NextResponse.redirect(url);
}

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;

  if (params.get("error")) {
    return redirectToAccounts(
      request,
      "youtube_cancelled",
    );
  }

  const code = params.get("code");
  const state = params.get("state");

  const cookieState = request.cookies.get(
    OAUTH_STATE_COOKIE,
  )?.value;

  if (!code || !state || !cookieState) {
    return redirectToAccounts(
      request,
      "youtube_invalid_state",
    );
  }

  if (state !== cookieState) {
    return redirectToAccounts(
      request,
      "youtube_invalid_state",
    );
  }

  let userId: string;

  try {
    const verifiedState = verifyOAuthState(
      state,
      "youtube",
    );

    userId = verifiedState.userId;
  } catch {
    return redirectToAccounts(
      request,
      "youtube_invalid_state",
    );
  }

  try {
    const redirectUri =
      process.env.YOUTUBE_REDIRECT_URI ||
      `${process.env.APP_URL}/api/oauth/youtube/callback`;

    const token =
      await exchangeYouTubeCode(
        code,
        redirectUri,
      );

    const channel =
      await getYouTubeChannel(
        token.accessToken,
      );

    const expiresAt =
      token.expiresIn
        ? new Date(
            Date.now() +
              token.expiresIn * 1000,
          )
        : null;

    await prisma.connectedAccount.upsert({
      where: {
        platform_platformUserId: {
          platform: "YOUTUBE",
          platformUserId: channel.channelId,
        },
      },
      update: {
        userId,
        accessToken: encrypt(
          token.accessToken,
        ),
        refreshToken: token.refreshToken
          ? encrypt(token.refreshToken)
          : undefined,
        expiresAt,
        profileName: channel.channelTitle,
        profilePicture:
          channel.profilePicture,
        youtubeDetail: {
          upsert: {
            update: {
              channelId: channel.channelId,
              channelTitle:
                channel.channelTitle,
            },
            create: {
              channelId: channel.channelId,
              channelTitle:
                channel.channelTitle,
            },
          },
        },
      },
      create: {
        userId,
        platform: "YOUTUBE",
        platformUserId: channel.channelId,
        accessToken: encrypt(
          token.accessToken,
        ),
        refreshToken: token.refreshToken
          ? encrypt(token.refreshToken)
          : null,
        expiresAt,
        profileName: channel.channelTitle,
        profilePicture:
          channel.profilePicture,
        youtubeDetail: {
          create: {
            channelId: channel.channelId,
            channelTitle:
              channel.channelTitle,
          },
        },
      },
    });

    const response = redirectToAccounts(
      request,
      "youtube_connected",
    );

    response.cookies.set(
      OAUTH_STATE_COOKIE,
      "",
      {
        httpOnly: true,
        secure:
          process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/api/oauth",
        maxAge: 0,
      },
    );

    return response;
  } catch (error) {
    console.error(
      "YouTube OAuth callback failed:",
      error,
    );

    return redirectToAccounts(
      request,
      "youtube_failed",
    );
  }
}