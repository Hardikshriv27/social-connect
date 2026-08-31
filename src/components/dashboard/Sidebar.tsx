"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  PenSquare,
  CalendarDays,
  FileText,
  BarChart3,
  Link2,
  Settings,
  Share2,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/posts/create", label: "Create post", icon: PenSquare },
  { href: "/calendar", label: "Calendar", icon: CalendarDays },
  { href: "/posts", label: "Posts", icon: FileText },
  { href: "/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/accounts", label: "Accounts", icon: Link2 },
];

const BOTTOM_ITEMS = [{ href: "/settings", label: "Settings", icon: Settings }];

export function Sidebar({ className }: { className?: string }) {
  const pathname = usePathname();

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(`${href}/`);

  return (
    <nav className={cn("flex h-full flex-col bg-surface", className)}>
      {/* Brand */}
      <div className="border-b border-line px-5 py-5">
        <Link href="/dashboard" className="group flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand shadow-sm transition-transform duration-200 group-hover:scale-105">
            <Share2
              className="h-[18px] w-[18px] text-brand-ink"
              strokeWidth={2}
            />
          </div>

          <div>
            <p className="text-[15px] font-semibold tracking-tight text-ink">
              Social Connect
            </p>
            <p className="mt-0.5 text-[11px] font-medium text-ink-muted">
              Content workspace
            </p>
          </div>
        </Link>
      </div>

      {/* Navigation */}
      <div className="flex flex-1 flex-col px-3 py-5">
        <p className="mb-3 px-3 text-[10px] font-semibold uppercase tracking-[0.12em] text-ink-faint">
          Workspace
        </p>

        <div className="flex flex-col gap-1">
          {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
            const active = isActive(href);

            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13.5px] font-medium transition-all duration-200",
                  active
                    ? "bg-brand-soft text-brand"
                    : "text-ink-muted hover:bg-surface-inset hover:text-ink",
                )}
              >
                <div
                  className={cn(
                    "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors",
                    active
                      ? "bg-surface text-brand shadow-sm"
                      : "text-ink-muted group-hover:bg-surface group-hover:text-ink",
                  )}
                >
                  <Icon
                    className="h-[17px] w-[17px]"
                    strokeWidth={active ? 2 : 1.8}
                  />
                </div>

                <span className="flex-1">{label}</span>

                {active && (
                  <ChevronRight
                    className="h-4 w-4 opacity-70"
                    strokeWidth={2}
                  />
                )}
              </Link>
            );
          })}
        </div>

        <div className="mt-auto">
          <div className="mb-3 border-t border-line" />

          {BOTTOM_ITEMS.map(({ href, label, icon: Icon }) => {
            const active = isActive(href);

            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13.5px] font-medium transition-all",
                  active
                    ? "bg-brand-soft text-brand"
                    : "text-ink-muted hover:bg-surface-inset hover:text-ink",
                )}
              >
                <div
                  className={cn(
                    "flex h-8 w-8 items-center justify-center rounded-lg",
                    active ? "bg-surface shadow-sm" : "group-hover:bg-surface",
                  )}
                >
                  <Icon className="h-[17px] w-[17px]" strokeWidth={1.8} />
                </div>

                {label}
              </Link>
            );
          })}
        </div>
      </div>

      {/* Bottom identity */}
      <div className="mx-3 mb-4 rounded-xl border border-line bg-surface-inset p-3">
        <p className="text-[11px] font-medium text-ink">Manage everything</p>

        <p className="mt-1 text-[10.5px] leading-relaxed text-ink-muted">
          Create, schedule and manage your social content from one place.
        </p>
      </div>
    </nav>
  );
}
