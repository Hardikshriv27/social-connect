import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatDate, initials } from "@/lib/utils";

export default async function SettingsPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login");
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, name: true, email: true, createdAt: true },
  });

  if (!user) {
    redirect("/login");
  }

  return (
    <div className="mx-auto max-w-xl">
      <div className="mb-8">
        <h1 className="text-xl font-semibold tracking-tight text-ink">Settings</h1>
        <p className="mt-1 text-[13.5px] text-ink-muted">Manage your profile and account.</p>
      </div>

      <div className="rounded-lg border border-line p-6">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-soft text-[15px] font-semibold text-brand">
            {initials(user.name, user.email)}
          </div>
          <div>
            <p className="text-[14.5px] font-medium text-ink">{user.name || "Unnamed user"}</p>
            <p className="text-[13px] text-ink-muted">{user.email}</p>
          </div>
        </div>

        <dl className="mt-6 divide-y divide-line border-t border-line">
          <div className="flex items-center justify-between py-3">
            <dt className="text-[13px] text-ink-muted">Name</dt>
            <dd className="text-[13px] text-ink">{user.name || "—"}</dd>
          </div>
          <div className="flex items-center justify-between py-3">
            <dt className="text-[13px] text-ink-muted">Email</dt>
            <dd className="text-[13px] text-ink">{user.email}</dd>
          </div>
          <div className="flex items-center justify-between py-3">
            <dt className="text-[13px] text-ink-muted">Member since</dt>
            <dd className="text-[13px] text-ink">{formatDate(user.createdAt)}</dd>
          </div>
        </dl>
      </div>

      <div className="mt-6 rounded-lg border border-line p-6">
        <h2 className="text-[13.5px] font-medium text-ink">Account</h2>
        <p className="mt-1 text-[13px] text-ink-muted">
          Profile editing, password changes, and account deletion aren&apos;t available yet.
        </p>
      </div>
    </div>
  );
}