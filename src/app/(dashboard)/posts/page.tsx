"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { FileText, PenSquare, Trash2, Loader2 } from "lucide-react";
import { EmptyState } from "@/components/ui/EmptyState";
import { StatusBadge } from "@/components/ui/Badge";
import { formatDateTime } from "@/lib/utils";

type Post = {
  id: string;
  title: string | null;
  content: string | null;
  status: string;
  scheduledAt: string | null;
  publishedAt: string | null;
  createdAt: string;
  media: {
    id: string;
    url: string;
    type: string;
  }[];
};

export default function PostsPage() {
  const [posts, setPosts] = useState<Post[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadPosts() {
      try {
        const response = await fetch("/api/posts");
        const data = await response.json();

        if (!cancelled) {
          if (!response.ok) {
            setError(data.error || "Could not load posts.");
          } else {
            setPosts(data.posts);
          }
        }
      } catch {
        if (!cancelled) {
          setError("Could not load posts.");
        }
      }
    }

    loadPosts();

    return () => {
      cancelled = true;
    };
  }, []);

  async function handleDelete(id: string) {
    if (!confirm("Delete this post? This cannot be undone.")) {
      return;
    }

    setDeletingId(id);

    try {
      const response = await fetch(`/api/posts/${id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        setPosts((prev) => prev?.filter((post) => post.id !== id) ?? null);
      } else {
        const data = await response.json().catch(() => null);
        setError(data?.error || "Could not delete this post.");
      }
    } catch {
      setError("Could not delete this post.");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-ink">
            Posts
          </h1>

          <p className="mt-1 text-[13.5px] text-ink-muted">
            All posts you&apos;ve created.
          </p>
        </div>

        <Link
          href="/create"
          className="flex items-center gap-2 rounded-md bg-brand px-4 py-2 text-sm font-medium text-brand-ink hover:opacity-90"
        >
          <PenSquare className="h-4 w-4" strokeWidth={1.75} />
          New post
        </Link>
      </div>

      {error && (
        <p className="mb-4 rounded-md border border-danger/20 bg-danger-soft px-3 py-2 text-sm text-danger">
          {error}
        </p>
      )}

      {posts === null ? (
        <div className="flex items-center justify-center rounded-lg border border-line py-16">
          <Loader2 className="h-5 w-5 animate-spin text-ink-muted" />
        </div>
      ) : posts.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="No posts yet"
          description="Create your first post and it will show up here."
          action={
            <Link
              href="/create"
              className="inline-flex items-center gap-2 rounded-md bg-brand px-4 py-2 text-sm font-medium text-brand-ink hover:opacity-90"
            >
              <PenSquare className="h-4 w-4" strokeWidth={1.75} />
              Create a post
            </Link>
          }
        />
      ) : (
        <ul className="divide-y divide-line rounded-lg border border-line">
          {posts.map((post) => (
            <li
              key={post.id}
              className="flex items-start justify-between gap-4 px-4 py-4"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2.5">
                  <p className="truncate text-[13.5px] font-medium text-ink">
                    {post.title || "Untitled post"}
                  </p>

                  <StatusBadge status={post.status} />
                </div>

                {post.content && (
                  <p className="mt-1 line-clamp-2 text-[13px] text-ink-muted">
                    {post.content}
                  </p>
                )}

                <p className="mt-1.5 text-[12px] text-ink-muted">
                  {post.status === "SCHEDULED"
                    ? `Scheduled for ${formatDateTime(post.scheduledAt)}`
                    : post.status === "PUBLISHED"
                      ? `Published ${formatDateTime(post.publishedAt)}`
                      : `Created ${formatDateTime(post.createdAt)}`}

                  {post.media.length > 0 &&
                    ` · ${post.media.length} attachment${
                      post.media.length > 1 ? "s" : ""
                    }`}
                </p>
              </div>

              <button
                type="button"
                onClick={() => handleDelete(post.id)}
                disabled={deletingId === post.id}
                className="flex shrink-0 items-center gap-1.5 rounded-md border border-line px-2.5 py-1.5 text-xs font-medium text-ink-muted transition hover:border-danger/30 hover:bg-danger-soft hover:text-danger disabled:cursor-not-allowed disabled:opacity-60"
              >
                {deletingId === post.id ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Trash2 className="h-3.5 w-3.5" strokeWidth={1.75} />
                )}
                Delete
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
