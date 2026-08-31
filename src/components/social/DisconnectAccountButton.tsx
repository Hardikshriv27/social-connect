"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Unplug } from "lucide-react";

export function DisconnectAccountButton({
  accountId,
}: {
  accountId: string;
}) {
  const router = useRouter();

  const [loading, setLoading] =
    useState(false);

  async function disconnect() {
    const confirmed = window.confirm(
      "Disconnect this account from Social Connect?",
    );

    if (!confirmed) {
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(
        "/api/oauth/disconnect",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            accountId,
          }),
        },
      );

      if (!response.ok) {
        throw new Error(
          "Failed to disconnect account.",
        );
      }

      router.refresh();
    } catch {
      alert(
        "Unable to disconnect this account. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      onClick={disconnect}
      disabled={loading}
      className="inline-flex items-center gap-2 rounded-md border border-line px-3 py-2 text-[12px] font-medium text-ink-muted transition hover:bg-danger-soft hover:text-danger disabled:cursor-not-allowed disabled:opacity-60"
    >
      {loading ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      ) : (
        <Unplug className="h-3.5 w-3.5" />
      )}

      Disconnect
    </button>
  );
}