import { redirect } from "next/navigation";
import { CalendarClock } from "lucide-react";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { EmptyState } from "@/components/ui/EmptyState";
import { cn } from "@/lib/utils";

type Post = Awaited<ReturnType<typeof prisma.post.findMany>>[number];

export default async function CalendarPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login");
  }

  const scheduledPosts = await prisma.post.findMany({
    where: { userId: session.user.id, status: "SCHEDULED", scheduledAt: { not: null } },
    orderBy: { scheduledAt: "asc" },
  });

  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const firstOfMonth = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const startWeekday = firstOfMonth.getDay();

  const postsByDay = new Map<number, Post[]>();
  for (const post of scheduledPosts) {
    if (!post.scheduledAt) continue;
    const d = new Date(post.scheduledAt);
    if (d.getFullYear() === year && d.getMonth() === month) {
      const day = d.getDate();
      postsByDay.set(day, [...(postsByDay.get(day) ?? []), post]);
    }
  }

  const monthLabel = firstOfMonth.toLocaleDateString("en-US", { month: "long", year: "numeric" });
  const cells: (number | null)[] = [
    ...Array.from({ length: startWeekday }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-8">
        <h1 className="text-xl font-semibold tracking-tight text-ink">Calendar</h1>
        <p className="mt-1 text-[13.5px] text-ink-muted">{monthLabel} · scheduled posts</p>
      </div>

      {scheduledPosts.length === 0 ? (
        <EmptyState
          icon={CalendarClock}
          title="Nothing scheduled"
          description="Posts you schedule will appear on the calendar by date."
        />
      ) : (
        <div className="overflow-hidden rounded-lg border border-line">
          <div className="grid grid-cols-7 border-b border-line">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
              <div key={day} className="px-2 py-2.5 text-center text-[11px] font-medium text-ink-muted">
                {day}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7">
            {cells.map((day, idx) => {
              const dayPosts = day ? postsByDay.get(day) ?? [] : [];
              const isToday = day === now.getDate();
              return (
                <div
                  key={idx}
                  className={cn(
                    "min-h-[92px] border-b border-r border-line p-2",
                    idx % 7 === 6 && "border-r-0",
                  )}
                >
                  {day && (
                    <>
                      <span
                        className={cn(
                          "inline-flex h-6 w-6 items-center justify-center rounded-full text-[12px]",
                          isToday ? "bg-brand text-brand-ink" : "text-ink-muted",
                        )}
                      >
                        {day}
                      </span>
                      <div className="mt-1 space-y-1">
                        {dayPosts.slice(0, 2).map((post) => (
                          <div
                            key={post.id}
                            className="truncate rounded bg-brand-soft px-1.5 py-0.5 text-[11px] font-medium text-brand"
                            title={post.title ?? undefined}
                          >
                            {post.title || "Untitled"}
                          </div>
                        ))}
                        {dayPosts.length > 2 && (
                          <p className="text-[11px] text-ink-muted">+{dayPosts.length - 2} more</p>
                        )}
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
