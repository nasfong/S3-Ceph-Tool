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

const REGIONS = [
  "us-east-1",
  "us-west-1",
  "us-west-2",
  "eu-west-1",
  "eu-central-1",
  "ap-southeast-1",
  "ap-southeast-2",
  "ap-northeast-1",
];

export function CreateBucketModal({
  open,
  onClose,
  onCreated,
  credentials,
}: CreateBucketModalProps) {
  const [bucketName, setBucketName] = useState("");
  const [region, setRegion] = useState("us-east-1");
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
          region,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to create bucket");
      }

      setBucketName("");
      setRegion("us-east-1");
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
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#111118] p-6">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-[#f1f0ff]">Create a new bucket</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-300 transition-colors"
          >
            ✕
          </button>
        </div>

        {error && (
          <div className={`mb-4 rounded-lg border-l-[3px] px-3 py-2 text-xs ${
            error.includes("limit reached") || error.includes("TooManyBuckets")
              ? "border-amber-500 bg-amber-500/10 text-amber-300"
              : "border-red-500 bg-red-500/10 text-red-300"
          }`}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-[11px] uppercase tracking-[0.08em] text-[#888899]">
              Bucket Name
            </label>
            <input
              type="text"
              value={bucketName}
              onChange={(e) => setBucketName(e.target.value)}
              placeholder="my-bucket"
              className="w-full rounded-lg border border-white/8 bg-[#1c1c28] px-3 py-2 font-mono text-sm text-[#f1f0ff] outline-none transition-all duration-150 placeholder:text-gray-500 focus:border-indigo-400 focus:shadow-[0_0_0_3px_rgba(99,102,241,0.2)]"
            />
          </div>

          <div>
            <label className="mb-1 block text-[11px] uppercase tracking-[0.08em] text-[#888899]">
              Region
            </label>
            <select
              value={region}
              onChange={(e) => setRegion(e.target.value)}
              className="w-full rounded-lg border border-white/8 bg-[#1c1c28] px-3 py-2 font-mono text-sm text-[#f1f0ff] outline-none transition-all duration-150 focus:border-indigo-400 focus:shadow-[0_0_0_3px_rgba(99,102,241,0.2)]"
            >
              {REGIONS.map((r) => (
                <option key={r} value={r} className="bg-[#1c1c28] text-[#f1f0ff]">
                  {r}
                </option>
              ))}
            </select>
          </div>

          <div className="flex gap-2 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-lg border border-white/12 px-3 py-2 text-xs font-medium text-[#f1f0ff] transition-all duration-150 hover:border-white/20 hover:bg-white/5"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 inline-flex items-center justify-center gap-2 rounded-lg bg-linear-to-r from-indigo-500 to-indigo-600 px-3 py-2 text-xs font-semibold text-white transition-all duration-150 hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading && (
                <span className="inline-block h-3 w-3 animate-spin rounded-full border border-white/30 border-t-white" />
              )}
              {loading ? "Creating..." : "Create Bucket"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
