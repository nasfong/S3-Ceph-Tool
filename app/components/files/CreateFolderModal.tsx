"use client";

import { useState } from "react";
import { S3Credentials } from "@/lib/types";
import { getHeaders } from "@/lib/session";

type CreateFolderModalProps = {
  open: boolean;
  bucket: string;
  prefix: string;
  credentials: S3Credentials;
  onClose: () => void;
  onCreated: () => void;
};

export function CreateFolderModal({
  open,
  bucket,
  prefix,
  credentials,
  onClose,
  onCreated,
}: CreateFolderModalProps) {
  const [folderName, setFolderName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  const handleCreate = async () => {
    if (!folderName.trim()) {
      setError("Folder name cannot be empty");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/s3/create-folder", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...getHeaders(credentials),
        },
        body: JSON.stringify({
          bucket,
          folderName: folderName.trim(),
          prefix: prefix || undefined,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to create folder");
      }

      setFolderName("");
      onCreated();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !loading) {
      handleCreate();
    }
    if (e.key === "Escape") {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-backdrop backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl border border-hairline-strong bg-surface shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-hairline px-6 py-4">
          <h2 className="text-lg font-semibold text-primary">Create folder</h2>
          <button
            onClick={onClose}
            disabled={loading}
            className="text-muted hover:text-primary transition-colors disabled:opacity-50"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5">
          {error && (
            <div className="mb-4 rounded-lg border-l-[3px] border-red-500 bg-red-500/10 px-3 py-2 text-sm text-danger">
              {error}
            </div>
          )}

          <div className="mb-4">
            <label className="block text-xs uppercase tracking-widest text-muted mb-2">
              Folder name
            </label>
            <input
              type="text"
              value={folderName}
              onChange={(e) => setFolderName(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="e.g., Documents, Photos, 2024..."
              disabled={loading}
              className="w-full rounded-lg border border-hairline-strong bg-app px-3 py-2 text-sm text-primary placeholder-gray-600 transition-all duration-150 focus:border-indigo-500 focus:outline-none disabled:opacity-50"
              autoFocus
            />
          </div>

          {prefix && (
            <div className="mb-4 text-xs text-muted">
              <p>Location: <span className="text-secondary font-mono">{prefix}</span></p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-3 border-t border-hairline px-6 py-4">
          <button
            onClick={onClose}
            disabled={loading}
            className="flex-1 rounded-lg border border-hairline-strong px-3 py-2 text-sm font-medium text-muted transition-all duration-150 hover:border-hairline-strong hover:text-primary disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
          <button
            onClick={handleCreate}
            disabled={loading || !folderName.trim()}
            className="flex-1 rounded-lg border border-indigo-400/30 bg-indigo-500/10 px-3 py-2 text-sm font-medium text-accent transition-all duration-150 hover:border-indigo-400/60 hover:bg-indigo-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Creating..." : "Create"}
          </button>
        </div>
      </div>
    </div>
  );
}
