"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { signOut } from "next-auth/react";
import {
  LogOut,
  Menu,
  Moon,
  Sun,
  Bell,
  Settings,
  ChevronDown,
  X,
} from "lucide-react";

import { initials } from "@/lib/utils";
import { useTheme } from "@/components/ui/ThemeProvider";
import { Sidebar } from "@/components/dashboard/Sidebar";

export function Topbar({
  name,
  email,
}: {
  name: string | null;
  email: string;
}) {
  const { theme, toggleTheme } = useTheme();

  const [menuOpen, setMenuOpen] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        menuRef.current &&
        !menuRef.current.contains(event.target as Node)
      ) {
        setMenuOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);

    return () =>
      document.removeEventListener(
        "mousedown",
        handleClickOutside,
      );
  }, []);

  return (
    <>
      <header className="sticky top-0 z-30 flex h-[72px] items-center justify-between border-b border-line bg-paper/85 px-4 backdrop-blur-xl sm:px-6 lg:px-8">
        {/* Left */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setMobileNavOpen(true)}
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-line bg-surface text-ink-muted transition hover:bg-surface-inset hover:text-ink lg:hidden"
            aria-label="Open navigation"
          >
            <Menu className="h-5 w-5" strokeWidth={1.8} />
          </button>

          <div className="hidden lg:block">
            <p className="text-[14px] font-semibold text-ink">
              Your workspace
            </p>

            <p className="mt-0.5 text-[12px] text-ink-muted">
              Manage your social presence
            </p>
          </div>
        </div>

        {/* Right */}
        <div className="flex items-center gap-2">
          {/* Theme */}
          <button
            type="button"
            onClick={toggleTheme}
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-line bg-surface text-ink-muted transition hover:bg-surface-inset hover:text-ink"
            aria-label={
              theme === "dark"
                ? "Switch to light mode"
                : "Switch to dark mode"
            }
          >
            {theme === "dark" ? (
              <Sun
                className="h-[18px] w-[18px]"
                strokeWidth={1.8}
              />
            ) : (
              <Moon
                className="h-[18px] w-[18px]"
                strokeWidth={1.8}
              />
            )}
          </button>

          {/* Notifications */}
          <button
            type="button"
            className="relative hidden h-10 w-10 items-center justify-center rounded-xl border border-line bg-surface text-ink-muted transition hover:bg-surface-inset hover:text-ink sm:flex"
            aria-label="Notifications"
          >
            <Bell
              className="h-[18px] w-[18px]"
              strokeWidth={1.8}
            />

            <span className="absolute right-2.5 top-2.5 h-1.5 w-1.5 rounded-full bg-brand" />
          </button>

          {/* Profile */}
          <div
            ref={menuRef}
            className="relative ml-1"
          >
            <button
              type="button"
              onClick={() =>
                setMenuOpen((open) => !open)
              }
              className="flex items-center gap-2 rounded-xl border border-transparent py-1.5 pl-1.5 pr-2 transition hover:border-line hover:bg-surface"
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand text-[12px] font-semibold text-brand-ink shadow-sm">
                {initials(name, email)}
              </div>

              <div className="hidden text-left sm:block">
                <p className="max-w-[130px] truncate text-[13px] font-semibold text-ink">
                  {name || "Your account"}
                </p>

                <p className="max-w-[130px] truncate text-[11px] text-ink-muted">
                  {email}
                </p>
              </div>

              <ChevronDown
                className="hidden h-4 w-4 text-ink-muted sm:block"
                strokeWidth={1.8}
              />
            </button>

            {menuOpen && (
              <div className="absolute right-0 top-[calc(100%+10px)] w-64 overflow-hidden rounded-2xl border border-line bg-surface p-2 shadow-[var(--shadow-hover)]">
                <div className="border-b border-line px-3 py-3">
                  <p className="truncate text-[13px] font-semibold text-ink">
                    {name || "Your account"}
                  </p>

                  <p className="mt-1 truncate text-[11.5px] text-ink-muted">
                    {email}
                  </p>
                </div>

                <div className="py-1">
                  <Link
                    href="/settings"
                    onClick={() => setMenuOpen(false)}
                    className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-medium text-ink-muted transition hover:bg-surface-inset hover:text-ink"
                  >
                    <Settings
                      className="h-4 w-4"
                      strokeWidth={1.8}
                    />

                    Settings
                  </Link>

                  <button
                    type="button"
                    onClick={() =>
                      signOut({
                        callbackUrl: "/login",
                      })
                    }
                    className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-[13px] font-medium text-danger transition hover:bg-danger-soft"
                  >
                    <LogOut
                      className="h-4 w-4"
                      strokeWidth={1.8}
                    />

                    Log out
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Mobile Navigation */}
      {mobileNavOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"
            onClick={() =>
              setMobileNavOpen(false)
            }
          />

          <aside className="absolute left-0 top-0 flex h-full w-[280px] flex-col border-r border-line bg-surface shadow-2xl">
            <button
              type="button"
              onClick={() =>
                setMobileNavOpen(false)
              }
              className="absolute right-3 top-3 z-10 flex h-9 w-9 items-center justify-center rounded-xl text-ink-muted hover:bg-surface-inset hover:text-ink"
              aria-label="Close navigation"
            >
              <X
                className="h-5 w-5"
                strokeWidth={1.8}
              />
            </button>

            <Sidebar className="w-full" />
          </aside>
        </div>
      )}
    </>
  );
}
