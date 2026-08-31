import Link from "next/link";
import { redirect } from "next/navigation";
import { Share2 } from "lucide-react";
import { auth } from "@/lib/auth";

export default async function HomePage() {
  const session = await auth();

  if (session?.user) {
    redirect("/dashboard");
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-paper px-6 text-center">
      <div className="mb-7 flex h-11 w-11 items-center justify-center rounded-lg bg-brand-soft">
        <Share2 className="h-5 w-5 text-brand" strokeWidth={1.75} />
      </div>
      <h1 className="text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
        Social Connect
      </h1>
      <p className="mt-3 max-w-sm text-[15px] leading-relaxed text-ink-muted">
        Plan, schedule, and publish across every platform from one calm
        dashboard.
      </p>
      <div className="mt-9 flex items-center gap-3">
        <Link
          href="/login"
          className="rounded-md bg-brand px-5 py-2.5 text-sm font-medium text-brand-ink transition hover:opacity-90"
        >
          Log in
        </Link>
        <Link
          href="/signup"
          className="rounded-md border border-line px-5 py-2.5 text-sm font-medium text-ink transition hover:bg-surface-inset"
        >
          Create account
        </Link>
      </div>
    </main>
  );
}
