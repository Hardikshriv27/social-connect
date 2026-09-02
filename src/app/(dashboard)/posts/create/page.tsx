"use client";

import { ChangeEvent, FormEvent, useRef, useState } from "react";
import { useRouter } from "next/navigation";

type Platform = "Facebook" | "Instagram" | "YouTube";

type StoredPost = {
  id: string;
  title: string;
  content: string;
  platforms: Platform[];
  files: {
    name: string;
    type: string;
    size: number;
  }[];
  status: "draft" | "published" | "scheduled";
  scheduleForLater: boolean;
  createdAt: string;
  publishedAt?: string;
};

const STORAGE_KEY = "social-connect-posts";

export default function CreatePostPage() {
  const router = useRouter();

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [selectedPlatforms, setSelectedPlatforms] = useState<Platform[]>([]);
  const [files, setFiles] = useState<File[]>([]);
  const [scheduleForLater, setScheduleForLater] = useState(false);
  const [message, setMessage] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const togglePlatform = (platform: Platform) => {
    setSelectedPlatforms((current) => {
      if (current.includes(platform)) {
        return current.filter((item) => item !== platform);
      }

      return [...current, platform];
    });

    setMessage("");
  };

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(event.target.files || []);

    if (selectedFiles.length > 0) {
      setFiles((current) => [...current, ...selectedFiles]);
      setMessage("");
    }

    event.target.value = "";
  };

  const removeFile = (index: number) => {
    setFiles((current) =>
      current.filter((_, fileIndex) => fileIndex !== index),
    );
  };

  const getStoredPosts = (): StoredPost[] => {
    try {
      const savedPosts = localStorage.getItem(STORAGE_KEY);

      if (!savedPosts) {
        return [];
      }

      const parsedPosts = JSON.parse(savedPosts);

      return Array.isArray(parsedPosts) ? parsedPosts : [];
    } catch {
      return [];
    }
  };

  const savePost = (status: "draft" | "published" | "scheduled") => {
    const post: StoredPost = {
      id:
        typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random().toString(36).slice(2)}`,

      title: title.trim(),
      content: content.trim(),

      platforms: selectedPlatforms,

      files: files.map((file) => ({
        name: file.name,
        type: file.type,
        size: file.size,
      })),

      status,
      scheduleForLater,
      createdAt: new Date().toISOString(),

      ...(status === "published"
        ? {
            publishedAt: new Date().toISOString(),
          }
        : {}),
    };

    const existingPosts = getStoredPosts();

    localStorage.setItem(STORAGE_KEY, JSON.stringify([post, ...existingPosts]));
  };

  const handleSaveDraft = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    setIsSaving(true);

    try {
      savePost("draft");

      setMessage("Post saved as draft.");

      setTimeout(() => {
        router.push("/posts");
      }, 500);
    } finally {
      setIsSaving(false);
    }
  };

  const handlePublish = () => {
    if (!title.trim()) {
      setMessage("Please enter a title.");
      return;
    }

    if (!content.trim()) {
      setMessage("Please enter post content.");
      return;
    }

    if (selectedPlatforms.length === 0) {
      setMessage("Please select at least one platform.");
      return;
    }

    setIsSaving(true);

    try {
      if (scheduleForLater) {
        savePost("scheduled");
        setMessage("Post scheduled successfully.");
      } else {
        savePost("published");
        setMessage("Post published successfully.");
      }

      setTimeout(() => {
        router.push("/posts");
      }, 500);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <main
      style={{
        width: "100%",
        minHeight: "100%",
        padding: "40px 48px",
        boxSizing: "border-box",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "900px",
          margin: "0 auto",
          background: "rgba(255,255,255,0.55)",
          border: "1px solid #d8ddd9",
          borderRadius: "18px",
          padding: "30px",
          boxSizing: "border-box",
        }}
      >
        <h1
          style={{
            margin: 0,
            color: "#27342f",
            fontSize: "28px",
            fontWeight: 700,
          }}
        >
          Create post
        </h1>

        <p
          style={{
            marginTop: "8px",
            marginBottom: "30px",
            color: "#66716b",
            fontSize: "15px",
          }}
        >
          Create and publish content across your connected platforms.
        </p>

        <form onSubmit={handleSaveDraft}>
          {/* TITLE */}
          <div style={{ marginBottom: "26px" }}>
            <label
              htmlFor="title"
              style={{
                display: "block",
                marginBottom: "9px",
                color: "#2d3934",
                fontWeight: 600,
              }}
            >
              Title
            </label>

            <input
              id="title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Enter post title"
              style={{
                width: "100%",
                height: "50px",
                padding: "0 16px",
                boxSizing: "border-box",
                border: "1px solid #d4d9d5",
                borderRadius: "10px",
                outline: "none",
                fontSize: "15px",
                background: "#ffffff",
                color: "#28332f",
              }}
            />
          </div>

          {/* CONTENT */}
          <div style={{ marginBottom: "30px" }}>
            <label
              htmlFor="content"
              style={{
                display: "block",
                marginBottom: "9px",
                color: "#2d3934",
                fontWeight: 600,
              }}
            >
              Content
            </label>

            <textarea
              id="content"
              value={content}
              onChange={(event) => setContent(event.target.value)}
              placeholder="Write your post content..."
              style={{
                width: "100%",
                minHeight: "170px",
                padding: "16px",
                boxSizing: "border-box",
                border: "1px solid #d4d9d5",
                borderRadius: "10px",
                outline: "none",
                resize: "vertical",
                fontSize: "15px",
                fontFamily: "inherit",
                background: "#ffffff",
                color: "#28332f",
              }}
            />
          </div>

          {/* PLATFORMS */}
          <div style={{ marginBottom: "28px" }}>
            <h3
              style={{
                margin: 0,
                marginBottom: "6px",
                color: "#2d3934",
                fontSize: "16px",
              }}
            >
              Platforms
            </h3>

            <p
              style={{
                marginTop: 0,
                marginBottom: "16px",
                color: "#66716b",
                fontSize: "14px",
              }}
            >
              Select where this post should be published.
            </p>

            <div
              style={{
                display: "flex",
                gap: "12px",
                flexWrap: "wrap",
              }}
            >
              {(["Facebook", "Instagram", "YouTube"] as Platform[]).map(
                (platform) => {
                  const active = selectedPlatforms.includes(platform);

                  return (
                    <button
                      key={platform}
                      type="button"
                      onClick={() => togglePlatform(platform)}
                      style={{
                        minWidth: "125px",
                        padding: "13px 20px",
                        borderRadius: "10px",
                        border: active
                          ? "1px solid #426856"
                          : "1px solid #d2d8d4",
                        background: active ? "#426856" : "#ffffff",
                        color: active ? "#ffffff" : "#46514c",
                        cursor: "pointer",
                        fontSize: "15px",
                        fontWeight: active ? 600 : 500,
                      }}
                    >
                      {platform}
                    </button>
                  );
                },
              )}
            </div>
          </div>

          {/* MEDIA */}
          <div style={{ marginBottom: "28px" }}>
            <h3
              style={{
                margin: 0,
                marginBottom: "6px",
                color: "#2d3934",
                fontSize: "16px",
              }}
            >
              Media
            </h3>

            <p
              style={{
                marginTop: 0,
                marginBottom: "14px",
                color: "#66716b",
                fontSize: "14px",
              }}
            >
              Add images or videos to your post.
            </p>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,video/*"
              multiple
              onChange={handleFileChange}
              style={{ display: "none" }}
            />

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              style={{
                padding: "13px 20px",
                borderRadius: "10px",
                border: "1px dashed #aeb8b2",
                background: "#ffffff",
                color: "#46514c",
                cursor: "pointer",
                fontSize: "15px",
              }}
            >
              Add image or video
            </button>

            <p
              style={{
                marginTop: "10px",
                marginBottom: 0,
                color: "#748078",
                fontSize: "13px",
              }}
            >
              Images and videos supported
            </p>

            {files.length > 0 && (
              <div
                style={{
                  marginTop: "16px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "8px",
                }}
              >
                {files.map((file, index) => (
                  <div
                    key={`${file.name}-${index}`}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      padding: "10px 14px",
                      background: "#f1f4f1",
                      borderRadius: "8px",
                      border: "1px solid #dce2dd",
                    }}
                  >
                    <span
                      style={{
                        color: "#3d4943",
                        fontSize: "14px",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                        paddingRight: "16px",
                      }}
                    >
                      {file.name}
                    </span>

                    <button
                      type="button"
                      onClick={() => removeFile(index)}
                      style={{
                        border: "none",
                        background: "transparent",
                        color: "#9b4d4d",
                        cursor: "pointer",
                        fontSize: "14px",
                        fontWeight: 600,
                      }}
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* SCHEDULE */}
          <label
            style={{
              width: "100%",
              display: "flex",
              alignItems: "center",
              gap: "12px",
              padding: "18px",
              marginBottom: "26px",
              boxSizing: "border-box",
              border: "1px solid #d5dbd7",
              borderRadius: "10px",
              cursor: "pointer",
              background: "#ffffff",
            }}
          >
            <input
              type="checkbox"
              checked={scheduleForLater}
              onChange={(event) => setScheduleForLater(event.target.checked)}
              style={{
                width: "18px",
                height: "18px",
                cursor: "pointer",
              }}
            />

            <span
              style={{
                color: "#303b36",
                fontWeight: 600,
              }}
            >
              Schedule for later
            </span>
          </label>

          {/* ACTION BUTTONS */}
          <div
            style={{
              display: "flex",
              gap: "12px",
              alignItems: "center",
              flexWrap: "wrap",
            }}
          >
            <button
              type="submit"
              disabled={isSaving}
              style={{
                padding: "14px 20px",
                borderRadius: "9px",
                border: "1px solid #d0d7d2",
                background: "#ffffff",
                color: "#344039",
                cursor: isSaving ? "not-allowed" : "pointer",
                fontSize: "15px",
                fontWeight: 600,
                opacity: isSaving ? 0.7 : 1,
              }}
            >
              Save as draft
            </button>

            <button
              type="button"
              onClick={handlePublish}
              disabled={isSaving}
              style={{
                padding: "14px 20px",
                borderRadius: "9px",
                border: "1px solid #426856",
                background: "#426856",
                color: "#ffffff",
                cursor: isSaving ? "not-allowed" : "pointer",
                fontSize: "15px",
                fontWeight: 600,
                opacity: isSaving ? 0.7 : 1,
              }}
            >
              {isSaving
                ? "Processing..."
                : scheduleForLater
                  ? "Schedule post"
                  : "Publish now"}
            </button>
          </div>

          {message && (
            <div
              style={{
                marginTop: "20px",
                padding: "13px 16px",
                borderRadius: "9px",
                background: "#edf4ef",
                border: "1px solid #cbdace",
                color: "#426856",
                fontSize: "14px",
                fontWeight: 500,
              }}
            >
              {message}
            </div>
          )}
        </form>
      </div>
    </main>
  );
}
