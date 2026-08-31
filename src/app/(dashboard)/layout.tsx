import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";

import { Sidebar } from "@/components/dashboard/Sidebar";
import { Topbar } from "@/components/dashboard/Topbar";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  return (
    <div className="min-h-screen bg-paper">
      {/* Desktop Sidebar */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-[270px] border-r border-line bg-surface lg:block">
        <Sidebar />
      </aside>

      {/* Main Application */}
      <div className="min-h-screen lg:pl-[270px]">
        <Topbar
          name={session.user.name ?? null}
          email={session.user.email ?? ""}
        />

        <main className="min-h-[calc(100vh-72px)] px-4 py-6 sm:px-6 sm:py-8 lg:px-10 xl:px-12">
          {children}
        </main>
      </div>
    </div>
  );
}
