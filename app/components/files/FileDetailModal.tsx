"use client";

import { useEffect, useState } from "react";
import { S3Credentials, S3Object } from "@/lib/types";
import { getHeaders } from "@/lib/session";
import { formatSize, formatDate, getFileIcon } from "@/lib/format";
import { ShareFileModal } from "./ShareFileModal";

type FileDetailModalProps = {
  file: S3Object;
  bucket: string;
  credentials: S3Credentials;
  onClose: () => void;
  onDeleted?: () => void;
};

const IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.bmp', '.ico'];

export function FileDetailModal({
  file,
  bucket,
  credentials,
  onClose,
  onDeleted,
}: FileDetailModalProps) {
  const [copied, setCopied] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [presignedUrl, setPresignedUrl] = useState<string | null>(null);
  const [loadingPresign, setLoadingPresign] = useState(true);
  const [presignError, setPresentError] = useState<string | null>(null);
  const [shareOpen, setShareOpen] = useState(false);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [onClose]);

  // Generate pre-signed URL on mount
  useEffect(() => {
    const generatePresignedUrl = async () => {
      try {
        setLoadingPresign(true);
        setPresentError(null);
        const res = await fetch(
          `/api/s3/presign?bucket=${encodeURIComponent(bucket)}&key=${encodeURIComponent(file.Key)}&action=GetObject&expiresIn=3600`,
          {
            headers: getHeaders(credentials),
          }
        );
        if (!res.ok) throw new Error("Failed to generate pre-signed URL");
        const data = await res.json();
        setPresignedUrl(data.url);
      } catch (err) {
        console.error("Failed to generate pre-signed URL:", err);
        setPresentError(err instanceof Error ? err.message : "Failed to generate URL");
      } finally {
        setLoadingPresign(false);
      }
    };

    generatePresignedUrl();
  }, [bucket, file.Key, credentials]);

  const fullPath = file.Key;
  
  // Check if file is an image
  const filename = file.Key.split("/").pop() || file.Key;
  const fileExtension = filename.substring(filename.lastIndexOf('.')).toLowerCase();
  const isImage = IMAGE_EXTENSIONS.includes(fileExtension);

  const handleCopyUrl = async () => {
    if (!presignedUrl) return;
    try {
      await navigator.clipboard.writeText(presignedUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy URL", err);
    }
  };

  const handleDownload = async () => {
    if (!presignedUrl) return;
    try {
      window.open(presignedUrl, "_blank");
    } catch (err) {
      console.error("Download failed", err);
    }
  };

  const handleDelete = async () => {
    try {
      setDeleting(true);
      const res = await fetch(
        `/api/s3/object?bucket=${encodeURIComponent(bucket)}&key=${encodeURIComponent(file.Key)}`,
        {
          method: "DELETE",
          headers: getHeaders(credentials),
        }
      );
      if (!res.ok) throw new Error("Failed to delete file");
      onDeleted?.();
      onClose();
    } catch (err) {
      console.error("Delete failed", err);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl border border-white/10 bg-[#111118] p-6">
        <div className="mb-4 flex items-start justify-between">
          <div className="flex items-center gap-3">
            <span className="text-3xl">{getFileIcon(file.Key)}</span>
            <div className="min-w-0 flex-1">
              <p className="truncate font-mono text-sm font-semibold text-[#f1f0ff]">
                {filename}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-300 transition-colors shrink-0"
          >
            ✕
          </button>
        </div>

        {/* Image Preview */}
        {isImage && (
          <div className="mb-4 rounded-lg border border-white/8 bg-black/20 overflow-hidden flex justify-center">
            {loadingPresign ? (
              <div className="h-96 flex items-center justify-center text-gray-400">
                Loading image...
              </div>
            ) : presignedUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={presignedUrl}
                alt={filename}
                className="max-w-full max-h-96 object-contain"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
            ) : (
              <div className="h-96 flex items-center justify-center text-red-400">
                Failed to load image
              </div>
            )}
          </div>
        )}

        <div className="mb-4 space-y-2 border-y border-white/8 py-4 text-xs">
          <div className="flex justify-between">
            <span className="text-[#888899]">Size</span>
            <span className="font-mono text-[#f1f0ff]">{formatSize(file.Size)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[#888899]">Last Modified</span>
            <span className="font-mono text-[#f1f0ff]">{formatDate(file.LastModified)}</span>
          </div>
          {file.ETag && (
            <div className="flex justify-between">
              <span className="text-[#888899]">ETag</span>
              <span className="truncate font-mono text-[#f1f0ff]">
                {file.ETag.slice(0, 16)}...
              </span>
            </div>
          )}
          <div className="flex flex-col gap-1">
            <span className="text-[#888899]">Full Path</span>
            <span className="truncate font-mono text-[#f1f0ff]">{fullPath}</span>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-[#888899]">Access URL</span>
            {loadingPresign ? (
              <span className="text-[#888899] text-xs">Generating secure URL...</span>
            ) : presignError ? (
              <span className="text-red-400 text-xs">{presignError}</span>
            ) : presignedUrl ? (
              <div className="flex gap-2 items-center">
                <code className="truncate font-mono text-[#f1f0ff] text-xs bg-white/5 rounded px-2 py-1 flex-1 break-all">
                  {presignedUrl}
                </code>
              </div>
            ) : null}
          </div>
        </div>

        {showDeleteConfirm && (
          <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300">
            Are you sure? This action cannot be undone.
          </div>
        )}

        <div className="flex gap-2">
          <button
            onClick={handleCopyUrl}
            disabled={!presignedUrl || loadingPresign}
            className="flex-1 rounded-lg border border-white/12 px-3 py-2 text-xs font-medium text-[#f1f0ff] transition-all duration-150 hover:border-white/20 hover:bg-white/5 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {copied ? "✓ Copied!" : "📋 Copy URL"}
          </button>
          <button
            onClick={handleDownload}
            disabled={!presignedUrl || loadingPresign}
            className="flex-1 rounded-lg border border-indigo-400/30 px-3 py-2 text-xs font-medium text-indigo-300 transition-all duration-150 hover:border-indigo-400/60 hover:bg-indigo-500/10 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            ⬇️ Download
          </button>
          <button
            onClick={() => setShareOpen(true)}
            disabled={!presignedUrl || loadingPresign}
            className="flex-1 rounded-lg border border-amber-400/30 px-3 py-2 text-xs font-medium text-amber-300 transition-all duration-150 hover:border-amber-400/60 hover:bg-amber-500/10 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            🔗 Share
          </button>
          {!showDeleteConfirm ? (
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="flex-1 rounded-lg border border-red-400/30 px-3 py-2 text-xs font-medium text-red-300 transition-all duration-150 hover:border-red-400/60 hover:bg-red-500/10"
            >
              🗑️ Delete
            </button>
          ) : (
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="flex-1 inline-flex items-center justify-center gap-1 rounded-lg bg-red-600 px-3 py-2 text-xs font-medium text-white transition-all duration-150 hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {deleting && (
                <span className="inline-block h-3 w-3 animate-spin rounded-full border border-white/30 border-t-white" />
              )}
              {deleting ? "Deleting..." : "Confirm Delete"}
            </button>
          )}
        </div>

        <ShareFileModal
          isOpen={shareOpen}
          onClose={() => setShareOpen(false)}
          bucket={bucket}
          fileKey={file.Key}
          fileName={filename}
          endpoint={credentials.endpoint}
          accessKey={credentials.accessKey}
          secretKey={credentials.secretKey}
          rejectUnauthorized={credentials.rejectUnauthorized}
        />
      </div>
    </div>
  );
}
