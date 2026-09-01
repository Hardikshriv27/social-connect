import { NextRequest, NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createPostSchema } from "@/lib/validations";

export async function GET() {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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

  return NextResponse.json({ posts });
}

export async function POST(request: NextRequest) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = createPostSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Validation failed",
        issues: parsed.error.flatten(),
      },
      { status: 400 },
    );
  }

  const { title, content, status, scheduledAt, mediaUrls, platforms } =
    parsed.data;

  if (!platforms || platforms.length === 0) {
    return NextResponse.json(
      {
        error: "Select at least one platform.",
      },
      { status: 400 },
    );
  }

  try {
    const connectedAccounts = await prisma.connectedAccount.findMany({
      where: {
        userId: session.user.id,

        platform: {
          in: platforms,
        },
      },

      select: {
        id: true,
        platform: true,
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
        { status: 400 },
      );
    }

    const post = await prisma.post.create({
      data: {
        userId: session.user.id,
        title,
        content,
        status,

        scheduledAt:
          status === "SCHEDULED" && scheduledAt ? new Date(scheduledAt) : null,

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

            status: status === "SCHEDULED" ? "PENDING" : "PENDING",
          })),
        },
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

    return NextResponse.json({ post }, { status: 201 });
  } catch (error) {
    console.error("Failed to create post:", error);

    return NextResponse.json(
      {
        error: "Failed to create post.",
      },
      { status: 500 },
    );
  }
}
