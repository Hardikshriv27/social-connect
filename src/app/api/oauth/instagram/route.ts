import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { encrypt } from "@/lib/encryption";

import {
  getInstagramProfile,
  getInstagramProfileName,
} from "@/services/meta/instagram";

export async function GET(request: Request) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  try {
    const accessToken = process.env.INSTAGRAM_ACCESS_TOKEN;

    if (!accessToken) {
      return NextResponse.redirect(
        new URL("/accounts?oauth=instagram_not_configured", request.url),
      );
    }

    const profile = await getInstagramProfile(accessToken);

    const encryptedToken = encrypt(accessToken);

    await prisma.connectedAccount.upsert({
      where: {
        platform_platformUserId: {
          platform: "INSTAGRAM",
          platformUserId: profile.id,
        },
      },

      update: {
        userId: session.user.id,
        accessToken: encryptedToken,
        refreshToken: null,
        profileName: getInstagramProfileName(profile),
        profilePicture: profile.profile_picture_url || null,

        instagramDetail: {
          upsert: {
            update: {
              instagramBusinessAccountId: profile.id,

              username: profile.username || null,
            },

            create: {
              instagramBusinessAccountId: profile.id,

              username: profile.username || null,
            },
          },
        },
      },

      create: {
        userId: session.user.id,
        platform: "INSTAGRAM",
        platformUserId: profile.id,
        accessToken: encryptedToken,
        profileName: getInstagramProfileName(profile),
        profilePicture: profile.profile_picture_url || null,

        instagramDetail: {
          create: {
            instagramBusinessAccountId: profile.id,

            username: profile.username || null,
          },
        },
      },
    });

    return NextResponse.redirect(
      new URL("/accounts?oauth=instagram_connected", request.url),
    );
  } catch (error) {
    console.error("Instagram connection failed:", error);

    return NextResponse.redirect(
      new URL("/accounts?oauth=instagram_failed", request.url),
    );
  }
}
