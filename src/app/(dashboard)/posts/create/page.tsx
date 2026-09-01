"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { ImagePlus, X, Loader2 } from "lucide-react";

import { cn } from "@/lib/utils";

import {
  FacebookIcon,
  InstagramIcon,
  YoutubeIcon,
} from "@/components/social/PlatformIcons";

const PLATFORMS = [
  {
    id: "FACEBOOK",
    label: "Facebook",
    icon: FacebookIcon,
    color: "text-[#1877F2]",
  },
  {
    id: "INSTAGRAM",
    label: "Instagram",
    icon: InstagramIcon,
    color: "text-[#E4405F]",
  },
  {
    id: "YOUTUBE",
    label: "YouTube",
    icon: YoutubeIcon,
    color: "text-[#FF0000]",
  },
] as const;

type UploadedMedia = {
  url: string;
  name: string;
};

export default function CreatePostPage() {
  const router = useRouter();

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");

  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([]);

  const [isScheduling, setIsScheduling] = useState(false);

  const [scheduledAt, setScheduledAt] = useState("");

  const [media, setMedia] = useState<UploadedMedia[]>([]);

  const [isUploading, setIsUploading] = useState(false);

  const [error, setError] = useState<string | null>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);

  function togglePlatform(id: string) {
    setSelectedPlatforms((previous) =>
      previous.includes(id)
        ? previous.filter((platform) => platform !== id)
        : [...previous, id],
    );
  }

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    event.target.value = "";

    if (!file) {
      return;
    }

    setError(null);
    setIsUploading(true);

    try {
      const formData = new FormData();

      formData.append("file", file);

      const response = await fetch("/api/uploads", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Upload failed.");

        return;
      }

      setMedia((previous) => [
        ...previous,
        {
          url: data.url,
          name: file.name,
        },
      ]);
    } catch {
      setError("Upload failed. Please try again.");
    } finally {
      setIsUploading(false);
    }
  }

  function removeMedia(url: string) {
    setMedia((previous) => previous.filter((item) => item.url !== url));
  }

  async function submitPost(status: "DRAFT" | "SCHEDULED") {
    setError(null);

    if (!title.trim() || !content.trim()) {
      setError("Title and content are required.");

      return;
    }

    if (selectedPlatforms.length === 0) {
      setError("Select at least one platform.");

      return;
    }

    if (status === "SCHEDULED" && !scheduledAt) {
      setError("Choose a date and time to schedule this post.");

      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/posts", {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify({
          title,
          content,
          status,

          scheduledAt:
            status === "SCHEDULED" ? new Date(scheduledAt).toISOString() : null,

          platforms: selectedPlatforms,

          mediaUrls: media.map((item) => item.url),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Could not save this post.");

        return;
      }

      router.push("/posts");

      router.refresh();
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();

    submitPost(isScheduling ? "SCHEDULED" : "DRAFT");
  }

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-8">
        <h1 className="text-xl font-semibold tracking-tight text-ink">
          Create post
        </h1>

        <p className="mt-1 text-[13.5px] text-ink-muted">
          Write your content, attach media, and publish or schedule it.
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="space-y-6 rounded-lg border border-line p-6"
      >
        <div>
          <label
            htmlFor="title"
            className="mb-1.5 block text-sm font-medium text-ink"
          >
            Title
          </label>

          <input
            id="title"
            type="text"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Give your post a name"
            className="w-full rounded-md border border-line bg-surface px-3.5 py-2.5 text-sm text-ink outline-none placeholder:text-ink-muted focus:border-brand"
          />
        </div>

        <div>
          <label
            htmlFor="content"
            className="mb-1.5 block text-sm font-medium text-ink"
          >
            Content
          </label>

          <textarea
            id="content"
            rows={6}
            value={content}
            onChange={(event) => setContent(event.target.value)}
            placeholder="What do you want to share?"
            className="w-full resize-none rounded-md border border-line bg-surface px-3.5 py-2.5 text-sm text-ink outline-none placeholder:text-ink-muted focus:border-brand"
          />
        </div>

        <div>
          <p className="mb-1.5 block text-sm font-medium text-ink">Platforms</p>

          <p className="mb-2.5 text-[12.5px] text-ink-muted">
            Select where this post should be published.
          </p>

          <div className="flex flex-wrap gap-2">
            {PLATFORMS.map(({ id, label, icon: Icon, color }) => {
              const isSelected = selectedPlatforms.includes(id);

              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => togglePlatform(id)}
                  className={cn(
                    "flex items-center gap-2 rounded-md border px-3.5 py-2 text-sm font-medium transition",
                    isSelected
                      ? "border-brand bg-brand-soft text-brand"
                      : "border-line text-ink-muted hover:text-ink",
                  )}
                >
                  <Icon
                    className={cn("h-4 w-4", isSelected ? "text-brand" : color)}
                  />

                  {label}
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <p className="mb-1.5 block text-sm font-medium text-ink">Media</p>

          <div className="flex flex-wrap gap-2">
            {media.map((item) => (
              <div
                key={item.url}
                className="flex items-center gap-2 rounded-md border border-line px-3 py-2 text-xs text-ink"
              >
                <span className="max-w-[140px] truncate">{item.name}</span>

                <button
                  type="button"
                  onClick={() => removeMedia(item.url)}
                  className="text-ink-muted hover:text-ink"
                  aria-label={`Remove ${item.name}`}
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}

            <label className="flex cursor-pointer items-center gap-2 rounded-md border border-dashed border-line px-3.5 py-2 text-xs font-medium text-ink-muted transition hover:border-brand hover:text-brand">
              {isUploading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <ImagePlus className="h-3.5 w-3.5" strokeWidth={1.75} />
              )}

              {isUploading ? "Uploading…" : "Attach file"}

              <input
                type="file"
                accept="image/png,image/jpeg,image/webp,image/gif,video/mp4,video/webm,video/quicktime"
                className="hidden"
                onChange={handleFileChange}
                disabled={isUploading}
              />
            </label>
          </div>
        </div>

        <div className="rounded-md border border-line bg-surface-inset p-4">
          <label className="flex items-center gap-2.5 text-sm font-medium text-ink">
            <input
              type="checkbox"
              checked={isScheduling}
              onChange={(event) => setIsScheduling(event.target.checked)}
              className="h-4 w-4 rounded border-line accent-brand"
            />
            Schedule for later
          </label>

          {isScheduling && (
            <input
              type="datetime-local"
              value={scheduledAt}
              onChange={(event) => setScheduledAt(event.target.value)}
              className="mt-3 w-full rounded-md border border-line bg-surface px-3.5 py-2.5 text-sm text-ink outline-none focus:border-brand"
            />
          )}
        </div>

        {error && (
          <p className="rounded-md border border-danger/20 bg-danger-soft px-3 py-2 text-sm text-danger">
            {error}
          </p>
        )}

        <div className="flex items-center gap-3 pt-1">
          <button
            type="button"
            disabled={isSubmitting}
            onClick={() => submitPost("DRAFT")}
            className="rounded-md border border-line px-4 py-2.5 text-sm font-medium text-ink transition hover:bg-surface-inset disabled:cursor-not-allowed disabled:opacity-60"
          >
            Save as draft
          </button>

          <button
            type="submit"
            disabled={isSubmitting}
            className="rounded-md bg-brand px-4 py-2.5 text-sm font-medium text-brand-ink transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting
              ? "Saving…"
              : isScheduling
                ? "Schedule post"
                : "Save as draft"}
          </button>
        </div>
      </form>
    </div>
  );
}
