import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { encrypt } from "@/lib/encryption";
import { OAUTH_STATE_COOKIE, verifyOAuthState } from "@/lib/oauth-state";

import {
  exchangeForLongLivedMetaToken,
  exchangeMetaCodeForUserToken,
  getManagedMetaPages,
  getMetaUser,
} from "@/services/meta/facebook";

import { getInstagramProfileName } from "@/services/meta/instagram";

function redirectToAccounts(request: NextRequest, status: string) {
  const url = new URL("/accounts", request.url);

  url.searchParams.set("oauth", status);

  return NextResponse.redirect(url);
}

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;

  const providerError = params.get("error") || params.get("error_reason");

  if (providerError) {
    return redirectToAccounts(request, "facebook_cancelled");
  }

  const code = params.get("code");
  const state = params.get("state");

  if (!code || !state) {
    console.error("Facebook OAuth callback missing code or state.");

    return redirectToAccounts(request, "facebook_invalid_state");
  }

  let userId: string;

  try {
    const verifiedState = verifyOAuthState(state, "facebook");

    userId = verifiedState.userId;
  } catch (error) {
    console.error("Facebook OAuth state verification failed:", error);

    return redirectToAccounts(request, "facebook_invalid_state");
  }

  try {
    const redirectUri =
      process.env.META_REDIRECT_URI ||
      `${process.env.APP_URL}/api/oauth/facebook/callback`;

    const shortLived = await exchangeMetaCodeForUserToken(code, redirectUri);

    const longLived = await exchangeForLongLivedMetaToken(
      shortLived.accessToken,
    );

    const [metaUser, pages] = await Promise.all([
      getMetaUser(longLived.accessToken),
      getManagedMetaPages(longLived.accessToken),
    ]);

    const expiresAt = longLived.expiresIn
      ? new Date(Date.now() + longLived.expiresIn * 1000)
      : null;

    const encryptedMetaToken = encrypt(longLived.accessToken);

    if (pages.length === 0) {
      await prisma.connectedAccount.upsert({
        where: {
          platform_platformUserId: {
            platform: "FACEBOOK",
            platformUserId: metaUser.id,
          },
        },
        update: {
          userId,
          accessToken: encryptedMetaToken,
          refreshToken: null,
          expiresAt,
          profileName: metaUser.name,
        },
        create: {
          userId,
          platform: "FACEBOOK",
          platformUserId: metaUser.id,
          accessToken: encryptedMetaToken,
          expiresAt,
          profileName: metaUser.name,
          facebookDetail: {
            create: {},
          },
        },
      });
    }

    for (const page of pages) {
      const encryptedPageToken = page.access_token
        ? encrypt(page.access_token)
        : null;

      await prisma.connectedAccount.upsert({
        where: {
          platform_platformUserId: {
            platform: "FACEBOOK",
            platformUserId: page.id,
          },
        },
        update: {
          userId,
          accessToken: encryptedMetaToken,
          refreshToken: null,
          expiresAt,
          profileName: page.name,
          facebookDetail: {
            upsert: {
              update: {
                pageId: page.id,
                pageName: page.name,
                pageAccessToken: encryptedPageToken,
              },
              create: {
                pageId: page.id,
                pageName: page.name,
                pageAccessToken: encryptedPageToken,
              },
            },
          },
        },
        create: {
          userId,
          platform: "FACEBOOK",
          platformUserId: page.id,
          accessToken: encryptedMetaToken,
          expiresAt,
          profileName: page.name,
          facebookDetail: {
            create: {
              pageId: page.id,
              pageName: page.name,
              pageAccessToken: encryptedPageToken,
            },
          },
        },
      });

      const instagram = page.instagram_business_account;

      if (!instagram?.id) {
        continue;
      }

      const profileName = getInstagramProfileName(instagram);

      await prisma.connectedAccount.upsert({
        where: {
          platform_platformUserId: {
            platform: "INSTAGRAM",
            platformUserId: instagram.id,
          },
        },
        update: {
          userId,
          accessToken: encryptedMetaToken,
          refreshToken: null,
          expiresAt,
          profileName,
          profilePicture: instagram.profile_picture_url || null,
          instagramDetail: {
            upsert: {
              update: {
                instagramBusinessAccountId: instagram.id,
                username: instagram.username || null,
              },
              create: {
                instagramBusinessAccountId: instagram.id,
                username: instagram.username || null,
              },
            },
          },
        },
        create: {
          userId,
          platform: "INSTAGRAM",
          platformUserId: instagram.id,
          accessToken: encryptedMetaToken,
          expiresAt,
          profileName,
          profilePicture: instagram.profile_picture_url || null,
          instagramDetail: {
            create: {
              instagramBusinessAccountId: instagram.id,
              username: instagram.username || null,
            },
          },
        },
      });
    }

    const response = redirectToAccounts(request, "facebook_connected");

    response.cookies.set(OAUTH_STATE_COOKIE, "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 0,
    });

    return response;
  } catch (error) {
    console.error("Facebook OAuth callback failed:", error);

    return redirectToAccounts(request, "facebook_failed");
  }
}
