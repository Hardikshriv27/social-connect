import { redirect } from "next/navigation";
import { BarChart3 } from "lucide-react";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { EmptyState } from "@/components/ui/EmptyState";

export default async function AnalyticsPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login");
  }

  const connectedAccountsCount = await prisma.connectedAccount.count({
    where: { userId: session.user.id },
  });

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-8">
        <h1 className="text-xl font-semibold tracking-tight text-ink">Analytics</h1>
        <p className="mt-1 text-[13.5px] text-ink-muted">
          Performance data from your connected platforms.
        </p>
      </div>

      <EmptyState
        icon={BarChart3}
        title="Analytics aren't available yet"
        description={
          connectedAccountsCount === 0
            ? "Connect a Facebook, Instagram, or YouTube account first. Once real platform APIs are integrated, performance data will appear here."
            : "Your accounts are connected, but platform analytics integrations aren't built yet. This page will show real metrics once those API connections are live — nothing here is estimated or simulated."
        }
      />
    </div>
  );
}