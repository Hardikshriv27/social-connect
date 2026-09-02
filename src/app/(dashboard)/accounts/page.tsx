import { redirect } from "next/navigation";
import { Link2 } from "lucide-react";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/utils";

import {
  FacebookIcon,
  InstagramIcon,
  YoutubeIcon,
} from "@/components/social/PlatformIcons";

import { EmptyState } from "@/components/ui/EmptyState";

import { DisconnectAccountButton } from "@/components/social/DisconnectAccountButton";

const PLATFORM_META = {
  FACEBOOK: {
    label: "Facebook",
    icon: FacebookIcon,
    color: "text-[#1877F2]",
    connectHref: "/api/oauth/facebook",
  },

  INSTAGRAM: {
    label: "Instagram",
    icon: InstagramIcon,
    color: "text-[#E4405F]",
    connectHref: "/api/oauth/instagram",
  },

  YOUTUBE: {
    label: "YouTube",
    icon: YoutubeIcon,
    color: "text-[#FF0000]",
    connectHref: "/api/oauth/youtube",
  },
} as const;

export default async function AccountsPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login");
  }

  const accounts = await prisma.connectedAccount.findMany({
    where: {
      userId: session.user.id,
    },
    include: {
      facebookDetail: true,
      instagramDetail: true,
      youtubeDetail: true,
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  const connectedPlatforms = new Set(
    accounts.map((account) => account.platform),
  );

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-8">
        <h1 className="text-xl font-semibold tracking-tight text-ink">
          Connected accounts
        </h1>

        <p className="mt-1 text-[13.5px] text-ink-muted">
          Connect your platforms to publish and schedule content.
        </p>
      </div>

      {accounts.length === 0 ? (
        <EmptyState
          icon={Link2}
          title="No accounts connected"
          description="Connect Facebook, Instagram, or YouTube to start publishing from Social Connect."
        />
      ) : (
        <ul className="mb-10 divide-y divide-line rounded-lg border border-line bg-surface">
          {accounts.map((account) => {
            const meta =
              PLATFORM_META[account.platform as keyof typeof PLATFORM_META];

            const Icon = meta?.icon ?? Link2;

            let displayName =
              account.profileName || meta?.label || account.platform;

            if (account.platform === "FACEBOOK") {
              displayName =
                account.facebookDetail?.pageName ||
                account.profileName ||
                "Facebook account";
            }

            if (account.platform === "INSTAGRAM") {
              displayName = account.instagramDetail?.username
                ? `@${account.instagramDetail.username}`
                : account.profileName || "Instagram account";
            }

            if (account.platform === "YOUTUBE") {
              displayName =
                account.youtubeDetail?.channelTitle ||
                account.profileName ||
                "YouTube channel";
            }

            return (
              <li
                key={account.id}
                className="flex flex-col gap-4 px-4 py-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-surface-inset">
                    <Icon
                      className={`h-5 w-5 ${meta?.color || "text-ink-muted"}`}
                    />
                  </div>

                  <div className="min-w-0">
                    <p className="truncate text-[13.5px] font-medium text-ink">
                      {displayName}
                    </p>

                    <p className="mt-0.5 text-[12.5px] text-ink-muted">
                      {meta?.label || account.platform}
                      {" · "}
                      Connected {formatDate(account.createdAt)}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span className="rounded-full bg-brand-soft px-2.5 py-1 text-[11px] font-medium text-brand">
                    Active
                  </span>

                  <DisconnectAccountButton accountId={account.id} />
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <h2 className="mb-4 text-[13px] font-medium text-ink-muted">
        Add a connection
      </h2>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <ConnectCard
          icon={FacebookIcon}
          label="Facebook"
          description="Connect Pages"
          color="text-[#1877F2]"
          href="/api/oauth/facebook"
          connected={connectedPlatforms.has("FACEBOOK")}
        />

        <ConnectCard
          icon={InstagramIcon}
          label="Instagram"
          description="Connect account"
          color="text-[#E4405F]"
          href="/api/oauth/instagram"
          connected={connectedPlatforms.has("INSTAGRAM")}
        />

        <ConnectCard
          icon={YoutubeIcon}
          label="YouTube"
          description="Connect channel"
          color="text-[#FF0000]"
          href="/api/oauth/youtube"
          connected={connectedPlatforms.has("YOUTUBE")}
        />
      </div>

      <p className="mt-4 text-[12px] text-ink-muted">
        Connect your Instagram professional account to manage and publish
        content through Social Connect.
      </p>
    </div>
  );
}

function ConnectCard({
  icon: Icon,
  label,
  description,
  color,
  href,
  connected,
}: {
  icon: typeof FacebookIcon;
  label: string;
  description: string;
  color: string;
  href: string;
  connected: boolean;
}) {
  if (connected) {
    return (
      <div className="flex items-center gap-3 rounded-lg border border-line px-4 py-3.5 opacity-60">
        <div className="flex h-9 w-9 items-center justify-center rounded-md bg-surface-inset">
          <Icon className={`h-4 w-4 ${color}`} />
        </div>

        <div>
          <p className="text-[13.5px] font-medium text-ink">{label}</p>

          <p className="text-[12.5px] text-ink-muted">Already connected</p>
        </div>
      </div>
    );
  }

  return (
    <a
      href={href}
      className="flex items-center gap-3 rounded-lg border border-line px-4 py-3.5 transition hover:bg-surface-inset"
    >
      <div className="flex h-9 w-9 items-center justify-center rounded-md bg-surface-inset">
        <Icon className={`h-4 w-4 ${color}`} />
      </div>

      <div>
        <p className="text-[13.5px] font-medium text-ink">{label}</p>

        <p className="text-[12.5px] text-ink-muted">{description}</p>
      </div>
    </a>
  );
}
