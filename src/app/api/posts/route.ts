import { NextRequest, NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { decrypt } from "@/lib/encryption";

import {
  publishFacebookPagePost,
  publishInstagramPost,
} from "@/services/meta/publish";

type Platform = "FACEBOOK" | "INSTAGRAM" | "YOUTUBE";

type PostStatus = "DRAFT" | "SCHEDULED" | "PUBLISHED";

type CreatePostBody = {
  title?: unknown;
  content?: unknown;
  status?: unknown;
  scheduledAt?: unknown;
  mediaUrls?: unknown;
  platforms?: unknown;
};

export async function GET() {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json(
      {
        error: "Unauthorized",
      },
      {
        status: 401,
      },
    );
  }

  const posts = await prisma.post.findMany({
    where: {
      userId: session.user.id,
    },

    orderBy: {
      createdAt: "desc",
    },

    include: {
      media: true,

      publishingInfos: {
        include: {
          connectedAccount: {
            select: {
              id: true,
              platform: true,
              profileName: true,
            },
          },
        },
      },
    },
  });

  return NextResponse.json({
    posts,
  });
}

export async function POST(request: NextRequest) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json(
      {
        error: "Unauthorized",
      },
      {
        status: 401,
      },
    );
  }

  let body: CreatePostBody;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      {
        error: "Invalid JSON body.",
      },
      {
        status: 400,
      },
    );
  }

  const title = typeof body.title === "string" ? body.title.trim() : "";

  const content = typeof body.content === "string" ? body.content.trim() : "";

  const validStatuses: PostStatus[] = ["DRAFT", "SCHEDULED", "PUBLISHED"];

  const status =
    typeof body.status === "string" &&
    validStatuses.includes(body.status as PostStatus)
      ? (body.status as PostStatus)
      : null;

  const validPlatforms: Platform[] = ["FACEBOOK", "INSTAGRAM", "YOUTUBE"];

  const platforms: Platform[] = Array.isArray(body.platforms)
    ? body.platforms.filter(
        (platform): platform is Platform =>
          typeof platform === "string" &&
          validPlatforms.includes(platform as Platform),
      )
    : [];

  const mediaUrls = Array.isArray(body.mediaUrls)
    ? body.mediaUrls.filter(
        (url): url is string => typeof url === "string" && url.length > 0,
      )
    : [];

  const scheduledAt =
    typeof body.scheduledAt === "string" ? body.scheduledAt : null;

  if (!title) {
    return NextResponse.json(
      {
        error: "Please enter a title.",
      },
      {
        status: 400,
      },
    );
  }

  if (!content) {
    return NextResponse.json(
      {
        error: "Please enter post content.",
      },
      {
        status: 400,
      },
    );
  }

  if (!status) {
    return NextResponse.json(
      {
        error: "Invalid post status.",
      },
      {
        status: 400,
      },
    );
  }

  if (platforms.length === 0) {
    return NextResponse.json(
      {
        error: "Select at least one platform.",
      },
      {
        status: 400,
      },
    );
  }

  /*
   * YouTube publishing isn't implemented yet.
   */
  if (status === "PUBLISHED" && platforms.includes("YOUTUBE")) {
    return NextResponse.json(
      {
        error:
          "YouTube publishing is not implemented yet. Select Facebook and/or Instagram.",
      },
      {
        status: 400,
      },
    );
  }

  let parsedScheduledAt: Date | null = null;

  if (status === "SCHEDULED") {
    if (!scheduledAt) {
      return NextResponse.json(
        {
          error: "Please select a date and time.",
        },
        {
          status: 400,
        },
      );
    }

    parsedScheduledAt = new Date(scheduledAt);

    if (Number.isNaN(parsedScheduledAt.getTime())) {
      return NextResponse.json(
        {
          error: "Invalid scheduled date.",
        },
        {
          status: 400,
        },
      );
    }
  }

  try {
    const connectedAccounts = await prisma.connectedAccount.findMany({
      where: {
        userId: session.user.id,

        platform: {
          in: platforms,
        },
      },

      include: {
        facebookDetail: true,
        instagramDetail: true,
      },
    });

    const connectedPlatforms = new Set(
      connectedAccounts.map((account) => account.platform),
    );

    const missingPlatforms = platforms.filter(
      (platform) => !connectedPlatforms.has(platform),
    );

    if (missingPlatforms.length > 0) {
      return NextResponse.json(
        {
          error: `No connected account found for: ${missingPlatforms.join(
            ", ",
          )}`,
        },
        {
          status: 400,
        },
      );
    }

    /*
     * We do NOT mark this Published yet.
     *
     * Meta must succeed first.
     */
    const databaseStatus = status === "PUBLISHED" ? "PUBLISHING" : status;

    const post = await prisma.post.create({
      data: {
        userId: session.user.id,

        title,
        content,

        status: databaseStatus,

        scheduledAt: parsedScheduledAt,

        media:
          mediaUrls.length > 0
            ? {
                create: mediaUrls.map((url) => ({
                  url,

                  type: /\.(mp4|mov|webm)$/i.test(url) ? "VIDEO" : "IMAGE",
                })),
              }
            : undefined,

        publishingInfos: {
          create: connectedAccounts.map((account) => ({
            connectedAccountId: account.id,

            status: "PENDING",
          })),
        },
      },

      include: {
        media: true,

        publishingInfos: true,
      },
    });

    /*
     * Draft = stop here.
     */
    if (status === "DRAFT") {
      return NextResponse.json(
        {
          post,
        },
        {
          status: 201,
        },
      );
    }

    /*
     * Scheduling engine can publish these later.
     */
    if (status === "SCHEDULED") {
      return NextResponse.json(
        {
          post,
        },
        {
          status: 201,
        },
      );
    }

    /*
     * ============
     * PUBLISH NOW
     * ============
     */

    const firstMedia = mediaUrls[0] || null;

    const failures: string[] = [];

    for (const account of connectedAccounts) {
      try {
        let externalPostId: string | null = null;

        /*
         * FACEBOOK
         */
        if (account.platform === "FACEBOOK") {
          const pageId = account.facebookDetail?.pageId;

          const encryptedPageToken = account.facebookDetail?.pageAccessToken;

          if (!pageId || !encryptedPageToken) {
            throw new Error(
              "Facebook Page ID or Page Access Token is missing. Reconnect Facebook.",
            );
          }

          const pageAccessToken = decrypt(encryptedPageToken);

          externalPostId = await publishFacebookPagePost({
            pageId,
            pageAccessToken,
            message: content,
            mediaUrl: firstMedia,
          });
        }

        /*
         * INSTAGRAM
         */
        if (account.platform === "INSTAGRAM") {
          const instagramId =
            account.instagramDetail?.instagramBusinessAccountId ||
            account.platformUserId;

          if (!instagramId) {
            throw new Error("Instagram account ID is missing.");
          }

          if (!firstMedia) {
            throw new Error(
              "Instagram requires an image. Attach an image before publishing.",
            );
          }

          externalPostId = await publishInstagramPost({
            instagramAccountId: instagramId,

            message: content,

            mediaUrl: firstMedia,
          });
        }

        if (!externalPostId) {
          throw new Error(
            `${account.platform} did not return a published post ID.`,
          );
        }

        await prisma.platformPublishingInfo.updateMany({
          where: {
            postId: post.id,

            connectedAccountId: account.id,
          },

          data: {
            status: "PUBLISHED",

            externalPostId,

            errorMessage: null,

            publishedAt: new Date(),
          },
        });
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Unknown publishing error.";

        console.error(`${account.platform} publishing failed:`, error);

        failures.push(`${account.platform}: ${message}`);

        await prisma.platformPublishingInfo.updateMany({
          where: {
            postId: post.id,

            connectedAccountId: account.id,
          },

          data: {
            status: "FAILED",

            errorMessage: message,
          },
        });
      }
    }

    /*
     * Only call the post Published if Meta actually succeeded.
     */
    if (failures.length > 0) {
      await prisma.post.update({
        where: {
          id: post.id,
        },

        data: {
          status: "FAILED",

          publishedAt: null,
        },
      });

      return NextResponse.json(
        {
          error: failures.join(" | "),
        },
        {
          status: 502,
        },
      );
    }

    const publishedPost = await prisma.post.update({
      where: {
        id: post.id,
      },

      data: {
        status: "PUBLISHED",

        publishedAt: new Date(),
      },

      include: {
        media: true,

        publishingInfos: {
          include: {
            connectedAccount: {
              select: {
                id: true,
                platform: true,
                profileName: true,
              },
            },
          },
        },
      },
    });

    return NextResponse.json(
      {
        post: publishedPost,
      },
      {
        status: 201,
      },
    );
  } catch (error) {
    console.error("Failed to create/publish post:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to create/publish post.",
      },
      {
        status: 500,
      },
    );
  }
}
