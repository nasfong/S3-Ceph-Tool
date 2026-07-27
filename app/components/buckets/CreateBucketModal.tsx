"use client";

import { useEffect, useState } from "react";
import { S3Credentials } from "@/lib/types";
import { getHeaders } from "@/lib/session";

type CreateBucketModalProps = {
  open: boolean;
  onClose: () => void;
  onCreated: (name: string) => void;
  credentials: S3Credentials;
};

export function CreateBucketModal({
  open,
  onClose,
  onCreated,
  credentials,
}: CreateBucketModalProps) {
  const [bucketName, setBucketName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (open) {
      document.addEventListener("keydown", handleEscape);
      return () => document.removeEventListener("keydown", handleEscape);
    }
  }, [open, onClose]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bucketName.trim()) {
      setError("Bucket name is required");
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const res = await fetch("/api/s3/buckets", {
        method: "POST",
        headers: {
          ...getHeaders(credentials),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          bucketName: bucketName.trim(),
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to create bucket");
      }

      setBucketName("");
      onCreated(bucketName.trim());
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-backdrop backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-md rounded-2xl border border-hairline-strong bg-surface p-6">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-primary">Create a new bucket</h3>
          <button
            onClick={onClose}
            className="text-muted hover:text-secondary transition-colors"
          >
            ✕
          </button>
        </div>

        {error && (
          <div className={`mb-4 rounded-lg border-l-[3px] px-3 py-2 text-xs ${
            error.includes("limit reached") || error.includes("TooManyBuckets")
              ? "border-warning/60 bg-warning/10 text-warning"
              : "border-red-500 bg-red-500/10 text-danger"
          }`}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-[11px] uppercase tracking-[0.08em] text-muted">
              Bucket Name
            </label>
            <input
              type="text"
              value={bucketName}
              onChange={(e) => setBucketName(e.target.value)}
              placeholder="my-bucket"
              className="w-full rounded-lg border border-hairline bg-surface-3 px-3 py-2 font-mono text-sm text-primary outline-none transition-all duration-150 placeholder:text-muted focus:border-brand-400 focus:shadow-[0_0_0_3px_rgba(28,117,188,0.2)]"
            />
          </div>

          <div className="flex gap-2 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-lg border border-hairline-strong px-3 py-2 text-xs font-medium text-primary transition-all duration-150 hover:border-hairline-strong hover:bg-fill"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 inline-flex items-center justify-center gap-2 rounded-lg bg-linear-to-r from-brand-500 to-brand-600 px-3 py-2 text-xs font-semibold text-white transition-all duration-150 hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading && (
                <span className="inline-block h-3 w-3 animate-spin rounded-full border border-hairline-strong border-t-white" />
              )}
              {loading ? "Creating..." : "Create Bucket"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
