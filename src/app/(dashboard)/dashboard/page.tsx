import Link from "next/link";
import { redirect } from "next/navigation";

import {
  Users,
  FileText,
  Clock,
  CheckCircle2,
  PenSquare,
  Link2,
  ArrowUpRight,
  Plus,
  CalendarDays,
  Sparkles,
  ArrowRight,
} from "lucide-react";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

import { StatCard } from "@/components/ui/StatCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { StatusBadge } from "@/components/ui/Badge";

import { formatDateTime } from "@/lib/utils";

type Post = Awaited<ReturnType<typeof prisma.post.findMany>>[number];

export default async function DashboardPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login");
  }

  const userId = session.user.id;

  const firstName = session.user.name?.trim().split(/\s+/)[0] || "there";

  const [
    connectedAccountsCount,
    totalPostsCount,
    scheduledCount,
    publishedCount,
    recentPosts,
  ] = await Promise.all([
    prisma.connectedAccount.count({
      where: {
        userId,
      },
    }),

    prisma.post.count({
      where: {
        userId,
      },
    }),

    prisma.post.count({
      where: {
        userId,
        status: "SCHEDULED",
      },
    }),

    prisma.post.count({
      where: {
        userId,
        status: "PUBLISHED",
      },
    }),

    prisma.post.findMany({
      where: {
        userId,
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 5,
    }),
  ]);

  return (
    <div className="mx-auto max-w-[1400px]">
      {/* Header */}
      <section className="mb-8 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-line bg-surface px-3 py-1.5 text-[11px] font-medium text-ink-muted shadow-sm">
            <Sparkles className="h-3.5 w-3.5 text-brand" />
            Social workspace
          </div>

          <h1 className="text-2xl font-semibold tracking-[-0.03em] text-ink sm:text-3xl">
            Welcome back, {firstName}.
          </h1>

          <p className="mt-2 max-w-xl text-[13.5px] leading-relaxed text-ink-muted">
            Manage your content, connected platforms and publishing schedule
            from one place.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <Link
            href="/accounts"
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-line bg-surface px-4 py-2.5 text-[13px] font-semibold text-ink transition hover:bg-surface-inset"
          >
            <Link2 className="h-4 w-4" strokeWidth={1.8} />
            Connect account
          </Link>

          <Link
            href="/create"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand px-4 py-2.5 text-[13px] font-semibold text-brand-ink shadow-sm transition hover:bg-brand-hover hover:shadow-md"
          >
            <Plus className="h-4 w-4" strokeWidth={2} />
            Create post
          </Link>
        </div>
      </section>

      {/* Stats */}
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Connected accounts"
          value={connectedAccountsCount}
          icon={Users}
        />

        <StatCard label="Total posts" value={totalPostsCount} icon={FileText} />

        <StatCard label="Scheduled" value={scheduledCount} icon={Clock} />

        <StatCard
          label="Published"
          value={publishedCount}
          icon={CheckCircle2}
        />
      </section>

      {/* Main Grid */}
      <section className="mt-8 grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.65fr)_minmax(320px,0.8fr)]">
        {/* Recent Posts */}
        <div className="premium-card overflow-hidden">
          <div className="flex items-center justify-between border-b border-line px-5 py-4 sm:px-6">
            <div>
              <h2 className="text-[15px] font-semibold text-ink">
                Recent posts
              </h2>

              <p className="mt-1 text-[12px] text-ink-muted">
                Your latest content activity
              </p>
            </div>

            <Link
              href="/posts"
              className="inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-brand transition hover:opacity-80"
            >
              View all
              <ArrowUpRight className="h-4 w-4" strokeWidth={1.8} />
            </Link>
          </div>

          {recentPosts.length === 0 ? (
            <div className="p-5 sm:p-6">
              <EmptyState
                icon={FileText}
                title="No posts yet"
                description="Create your first post and start building your publishing workflow."
                action={
                  <Link
                    href="/create"
                    className="inline-flex items-center gap-2 rounded-xl bg-brand px-4 py-2.5 text-[13px] font-semibold text-brand-ink transition hover:bg-brand-hover"
                  >
                    <PenSquare className="h-4 w-4" strokeWidth={1.8} />
                    Create your first post
                  </Link>
                }
              />
            </div>
          ) : (
            <div className="divide-y divide-line">
              {recentPosts.map((post: Post) => (
                <Link
                  href="/posts"
                  key={post.id}
                  className="group flex items-center justify-between gap-4 px-5 py-4 transition hover:bg-surface-hover sm:px-6"
                >
                  <div className="min-w-0">
                    <p className="truncate text-[13.5px] font-semibold text-ink transition group-hover:text-brand">
                      {post.title || "Untitled post"}
                    </p>

                    <p className="mt-1 text-[12px] text-ink-muted">
                      {post.status === "SCHEDULED"
                        ? `Scheduled for ${formatDateTime(post.scheduledAt)}`
                        : post.status === "PUBLISHED"
                          ? `Published ${formatDateTime(post.publishedAt)}`
                          : `Created ${formatDateTime(post.createdAt)}`}
                    </p>
                  </div>

                  <div className="flex shrink-0 items-center gap-3">
                    <StatusBadge status={post.status} />

                    <ArrowRight
                      className="h-4 w-4 text-ink-faint transition-transform group-hover:translate-x-1"
                      strokeWidth={1.8}
                    />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Right Side */}
        <div className="flex flex-col gap-6">
          {/* Quick Actions */}
          <div className="premium-card p-5 sm:p-6">
            <div className="mb-5">
              <h2 className="text-[15px] font-semibold text-ink">
                Quick actions
              </h2>

              <p className="mt-1 text-[12px] text-ink-muted">
                Jump straight into your workflow.
              </p>
            </div>

            <div className="flex flex-col gap-3">
              <Link
                href="/create"
                className="premium-card-hover group flex items-center gap-4 rounded-2xl border border-line bg-surface-inset p-4"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand text-brand-ink shadow-sm">
                  <PenSquare className="h-[18px] w-[18px]" strokeWidth={1.8} />
                </div>

                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-semibold text-ink">
                    Create a post
                  </p>

                  <p className="mt-1 text-[11.5px] text-ink-muted">
                    Write a draft or schedule content.
                  </p>
                </div>

                <ArrowRight
                  className="h-4 w-4 text-ink-faint transition-transform group-hover:translate-x-1"
                  strokeWidth={1.8}
                />
              </Link>

              <Link
                href="/calendar"
                className="premium-card-hover group flex items-center gap-4 rounded-2xl border border-line bg-surface-inset p-4"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand">
                  <CalendarDays
                    className="h-[18px] w-[18px]"
                    strokeWidth={1.8}
                  />
                </div>

                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-semibold text-ink">
                    View calendar
                  </p>

                  <p className="mt-1 text-[11.5px] text-ink-muted">
                    Review your publishing schedule.
                  </p>
                </div>

                <ArrowRight
                  className="h-4 w-4 text-ink-faint transition-transform group-hover:translate-x-1"
                  strokeWidth={1.8}
                />
              </Link>

              <Link
                href="/accounts"
                className="premium-card-hover group flex items-center gap-4 rounded-2xl border border-line bg-surface-inset p-4"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand">
                  <Link2 className="h-[18px] w-[18px]" strokeWidth={1.8} />
                </div>

                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-semibold text-ink">
                    Connect platforms
                  </p>

                  <p className="mt-1 text-[11.5px] text-ink-muted">
                    Manage Facebook, Instagram and YouTube.
                  </p>
                </div>

                <ArrowRight
                  className="h-4 w-4 text-ink-faint transition-transform group-hover:translate-x-1"
                  strokeWidth={1.8}
                />
              </Link>
            </div>
          </div>

          {/* Activity Summary */}
          <div className="overflow-hidden rounded-2xl border border-brand/20 bg-brand-soft p-5 sm:p-6">
            <div className="flex items-start gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-surface text-brand shadow-sm">
                <CheckCircle2 className="h-[18px] w-[18px]" strokeWidth={1.8} />
              </div>

              <div>
                <p className="text-[13px] font-semibold text-ink">
                  Your workspace is ready
                </p>

                <p className="mt-1.5 text-[12px] leading-relaxed text-ink-muted">
                  Connect your social platforms and start creating content from
                  your dashboard.
                </p>

                <Link
                  href="/accounts"
                  className="mt-4 inline-flex items-center gap-1.5 text-[12px] font-semibold text-brand"
                >
                  Manage accounts
                  <ArrowRight className="h-3.5 w-3.5" strokeWidth={1.8} />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
