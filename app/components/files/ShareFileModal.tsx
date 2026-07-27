"use client";

import { useState } from "react";

interface ShareFileModalProps {
  isOpen: boolean;
  onClose: () => void;
  bucket: string;
  fileKey: string;
  fileName: string;
  endpoint: string;
  accessKey: string;
  secretKey: string;
  rejectUnauthorized: boolean;
}

const EXPIRATION_OPTIONS = [
  { label: "5 minutes", value: 5 * 60 },
  { label: "30 minutes", value: 30 * 60 },
  { label: "1 hour", value: 60 * 60 },
  { label: "1 day", value: 24 * 60 * 60 },
  { label: "7 days", value: 7 * 24 * 60 * 60 },
];

export function ShareFileModal({
  isOpen,
  onClose,
  bucket,
  fileKey,
  fileName,
  endpoint,
  accessKey,
  secretKey,
  rejectUnauthorized,
}: ShareFileModalProps) {
  const [selectedExpiration, setSelectedExpiration] = useState(60 * 60); // 1 hour
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<Date | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const generateShareLink = async () => {
    setLoading(true);
    setError(null);
    setShareUrl(null);
    setExpiresAt(null);
    try {
      const startTime = Date.now();
      const response = await fetch("/api/s3/presign", {
        method: "POST",
        headers: {
          "x-s3-endpoint": endpoint,
          "x-s3-access-key": accessKey,
          "x-s3-secret-key": secretKey,
          "x-s3-reject-unauthorized": rejectUnauthorized ? "true" : "false",
        },
        body: JSON.stringify({
          bucket,
          key: fileKey,
          action: "GetObject",
          disposition: "inline",
          expiresIn: selectedExpiration,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to generate share link");
      }

      const data = await response.json();
      
      // Ensure minimum loading time of 800ms
      const elapsedTime = Date.now() - startTime;
      const minLoadingTime = 800;
      if (elapsedTime < minLoadingTime) {
        await new Promise((resolve) => setTimeout(resolve, minLoadingTime - elapsedTime));
      }
      
      setShareUrl(data.url);
      setExpiresAt(new Date(data.expiresAt));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate share link");
      setShareUrl(null);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = async () => {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  const copyAsMarkdown = async () => {
    if (!shareUrl || !expiresAt) return;
    const markdown = `[${fileName}](${shareUrl})`;
    try {
      await navigator.clipboard.writeText(markdown);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-backdrop flex items-center justify-center z-50">
      <div className="bg-surface-3 border border-hairline rounded-xl p-6 max-w-md w-full mx-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-lg font-semibold text-primary">Share File</h2>
            <p className="text-sm text-muted mt-1 truncate max-w-xs">{fileName}</p>
          </div>
          <button
            onClick={onClose}
            className="text-muted hover:text-primary transition-colors text-2xl"
          >
            ✕
          </button>
        </div>

        {/* Expiration Selector */}
        <div className="mb-4">
          <label className="block text-xs font-semibold text-muted uppercase tracking-widest mb-2">
            Link Expires In
          </label>
          <select
            value={selectedExpiration}
            onChange={(e) => {
              setSelectedExpiration(Number(e.target.value));
              setShareUrl(null);
              setExpiresAt(null);
            }}
            disabled={loading}
            className="w-full px-3 py-2 bg-surface border border-hairline rounded-lg text-primary text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:border-brand-500/50 transition-colors focus:outline-none focus:border-brand-500"
          >
            {EXPIRATION_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        {/* Generate Button */}
        <button
          onClick={generateShareLink}
          disabled={loading}
          className="w-full px-4 py-2 bg-brand-600 text-white font-medium rounded-lg hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors mb-4 flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <div className="w-4 h-4 border-2 border-hairline-strong border-t-white rounded-full animate-spin" />
              Generating...
            </>
          ) : shareUrl ? (
            "Regenerate Link"
          ) : (
            "Generate Link"
          )}
        </button>

        {/* Error */}
        {error && (
          <div className="p-3 mb-4 border-l-4 border-red-500 bg-red-500/10 rounded text-danger text-sm">
            {error}
          </div>
        )}

        {/* Share URL Display */}
        {shareUrl && expiresAt && (
          <div className="space-y-3">
            <div className="p-3 bg-surface border border-hairline rounded-lg">
              <p className="text-xs text-muted uppercase tracking-widest font-semibold mb-2">
                Share Link
              </p>
              <p className="text-xs text-muted break-all font-mono">{shareUrl}</p>
            </div>

            <p className="text-xs text-muted">
              Valid until <span className="text-accent font-mono">{expiresAt.toLocaleString()}</span>
            </p>

            <div className="flex gap-2">
              <button
                onClick={copyToClipboard}
                className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-surface border border-hairline text-primary text-sm rounded-lg hover:border-brand-500/50 transition-colors"
              >
                {copied ? "✓ Copied" : "📋 Copy"}
              </button>
              <button
                onClick={copyAsMarkdown}
                className="flex-1 px-3 py-2 bg-surface border border-hairline text-primary text-sm rounded-lg hover:border-brand-500/50 transition-colors"
                title="Copy as Markdown link"
              >
                Copy Markdown
              </button>
            </div>

            <p className="text-xs text-secondary bg-warning/10 border border-warning/20 p-2 rounded">
              ℹ️ This link will automatically expire after the selected time. Anyone with this link can access the file until then.
            </p>
          </div>
        )}

        {/* Close Button */}
        <button
          onClick={onClose}
          className="w-full mt-4 px-4 py-2 border border-hairline text-secondary font-medium rounded-lg hover:border-brand-500/50 transition-colors"
        >
          Close
        </button>
      </div>
    </div>
  );
}