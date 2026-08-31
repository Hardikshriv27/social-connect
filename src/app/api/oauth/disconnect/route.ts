import { NextRequest, NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

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

  let body: {
    accountId?: string;
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      {
        error: "Invalid request body.",
      },
      {
        status: 400,
      },
    );
  }

  if (!body.accountId) {
    return NextResponse.json(
      {
        error: "Account ID is required.",
      },
      {
        status: 400,
      },
    );
  }

  const account =
    await prisma.connectedAccount.findFirst({
      where: {
        id: body.accountId,
        userId: session.user.id,
      },
      select: {
        id: true,
      },
    });

  if (!account) {
    return NextResponse.json(
      {
        error: "Account not found.",
      },
      {
        status: 404,
      },
    );
  }

  await prisma.$transaction([
    prisma.platformPublishingInfo.deleteMany({
      where: {
        connectedAccountId: account.id,
      },
    }),
    prisma.connectedAccount.delete({
      where: {
        id: account.id,
      },
    }),
  ]);

  return NextResponse.json({
    success: true,
  });
}