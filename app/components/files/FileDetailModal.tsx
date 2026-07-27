"use client";

import { useEffect, useState, useRef } from "react";
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
const VIDEO_EXTENSIONS = ['.mp4', '.webm', '.ogg', '.mov', '.avi', '.mkv', '.m4v', '.flv', '.wmv'];

function isImageFile(key: string) {
  const ext = key.substring(key.lastIndexOf('.')).toLowerCase();
  return IMAGE_EXTENSIONS.includes(ext);
}

function isVideoFile(key: string) {
  const ext = key.substring(key.lastIndexOf('.')).toLowerCase();
  return VIDEO_EXTENSIONS.includes(ext);
}

/** Shimmer skeleton shared by image and video placeholders */
function MediaSkeleton({ aspectRatio = "16/9" }: { aspectRatio?: string }) {
  return (
    <div
      className="relative w-full overflow-hidden rounded-lg bg-fill"
      style={{ aspectRatio }}
    >
      {/* shimmer sweep */}
      <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.6s_infinite] bg-gradient-to-r from-transparent via-hairline to-transparent" />
      {/* subtle inner pattern */}
      <div className="absolute inset-0 flex items-center justify-center">
        <svg
          className="h-10 w-10 text-muted"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909"
          />
        </svg>
      </div>
    </div>
  );
}

/** Image preview with shimmer skeleton while loading */
function ImagePreview({ src, alt }: { src: string; alt: string }) {
  const [status, setStatus] = useState<"loading" | "loaded" | "error">("loading");

  return (
    <div className="relative flex min-h-[120px] items-center justify-center">
      {status === "loading" && <MediaSkeleton aspectRatio="16/9" />}

      {status === "error" && (
        <div className="flex h-32 w-full items-center justify-center gap-2 rounded-lg border border-red-500/20 bg-red-500/5 text-xs text-danger">
          <span>⚠</span>
          <span>Failed to load image</span>
        </div>
      )}

      {/* Always render img so onLoad fires; hide while not ready */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt}
        onLoad={() => setStatus("loaded")}
        onError={() => setStatus("error")}
        className={[
          "max-h-96 max-w-full rounded-lg object-contain transition-opacity duration-300",
          status === "loaded" ? "opacity-100" : "absolute opacity-0 pointer-events-none",
        ].join(" ")}
      />
    </div>
  );
}

/** Video preview with native controls and skeleton while metadata loads */
function VideoPreview({ src, filename }: { src: string; filename: string }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");

  const ext = filename.substring(filename.lastIndexOf('.')).toLowerCase().replace('.', '');
  // Map common extensions to MIME types browsers understand
  const mimeMap: Record<string, string> = {
    mp4: "video/mp4",
    webm: "video/webm",
    ogg: "video/ogg",
    mov: "video/mp4",       // most browsers handle .mov as mp4
    m4v: "video/mp4",
    mkv: "video/x-matroska",
    avi: "video/x-msvideo",
    flv: "video/x-flv",
    wmv: "video/x-ms-wmv",
  };
  const mimeType = mimeMap[ext] ?? "video/mp4";

  return (
    <div className="relative w-full overflow-hidden rounded-lg bg-backdrop">
      {status === "loading" && (
        <div className="absolute inset-0 z-10">
          <MediaSkeleton aspectRatio="16/9" />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full border border-hairline-strong bg-fill backdrop-blur-sm">
              {/* play-like spinner */}
              <span className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-hairline-strong border-t-indigo-400" />
            </div>
          </div>
        </div>
      )}

      {status === "error" && (
        <div className="flex h-40 items-center justify-center gap-2 text-xs text-danger">
          <span>⚠</span>
          <span>This video format may not be supported in your browser.</span>
        </div>
      )}

      <video
        ref={videoRef}
        controls
        preload="metadata"
        onLoadedMetadata={() => setStatus("ready")}
        onError={() => setStatus("error")}
        className={[
          "w-full rounded-lg transition-opacity duration-300",
          status === "ready" ? "opacity-100" : "opacity-0 pointer-events-none",
        ].join(" ")}
        style={{ maxHeight: "22rem" }}
      >
        <source src={src} type={mimeType} />
        Your browser does not support the video tag.
      </video>

      {/* Duration / format badge shown once ready */}
      {status === "ready" && (
        <div className="absolute right-2 top-2 rounded-md bg-backdrop px-2 py-0.5 text-[10px] font-mono text-secondary backdrop-blur-sm">
          {ext.toUpperCase()}
        </div>
      )}
    </div>
  );
}

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

  const filename = file.Key.split("/").pop() || file.Key;
  const isImage = isImageFile(file.Key);
  const isVideo = isVideoFile(file.Key);
  const hasMediaPreview = isImage || isVideo;

  // Construct origin URL (without presigning)
  const originUrl = credentials.endpoint
    ? `${credentials.endpoint}/${bucket}/${encodeURIComponent(file.Key).replace(/%2F/g, '/')}`
    : null;

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [onClose]);

  useEffect(() => {
    const generatePresignedUrl = async () => {
      try {
        setLoadingPresign(true);
        setPresentError(null);
        const res = await fetch(
          `/api/s3/presign?bucket=${encodeURIComponent(bucket)}&key=${encodeURIComponent(file.Key)}&action=GetObject&expiresIn=3600`,
          { headers: getHeaders(credentials) }
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

  const handleCopyUrl = async () => {
    if (!originUrl) return;
    try {
      await navigator.clipboard.writeText(originUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy URL", err);
    }
  };

  const handleDownload = () => {
    if (!presignedUrl) return;
    window.open(presignedUrl, "_blank");
  };

  const handleDelete = async () => {
    try {
      setDeleting(true);
      const res = await fetch(
        `/api/s3/object?bucket=${encodeURIComponent(bucket)}&key=${encodeURIComponent(file.Key)}`,
        { method: "DELETE", headers: getHeaders(credentials) }
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
    <>
      {/* Keyframe injection – Tailwind JIT won't generate arbitrary @keyframes */}
      <style>{`
        @keyframes shimmer {
          100% { transform: translateX(200%); }
        }
      `}</style>

      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-backdrop backdrop-blur-sm p-4"
        onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      >
        <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl border border-hairline-strong bg-surface p-6">
          {/* Header */}
          <div className="mb-4 flex items-start justify-between">
            <div className="flex items-center gap-3 min-w-0">
              <span className="text-3xl shrink-0">{getFileIcon(file.Key)}</span>
              <p className="truncate font-mono text-sm font-semibold text-primary">
                {filename}
              </p>
            </div>
            <button
              onClick={onClose}
              className="ml-3 shrink-0 text-muted hover:text-secondary transition-colors"
            >
              ✕
            </button>
          </div>

          {/* ── Media preview area ── */}
          {hasMediaPreview && (
            <div className="mb-4 overflow-hidden rounded-lg border border-hairline bg-backdrop p-2">
              {/* While presign URL is loading, show skeleton regardless of type */}
              {loadingPresign && <MediaSkeleton aspectRatio="16/9" />}

              {!loadingPresign && presignError && (
                <div className="flex h-32 items-center justify-center gap-2 text-xs text-danger">
                  <span>⚠</span>
                  <span>{presignError}</span>
                </div>
              )}

              {!loadingPresign && presignedUrl && isImage && (
                <ImagePreview src={presignedUrl} alt={filename} />
              )}

              {!loadingPresign && presignedUrl && isVideo && (
                <VideoPreview src={presignedUrl} filename={filename} />
              )}
            </div>
          )}

          {/* File metadata */}
          <div className="mb-4 space-y-2 border-y border-hairline py-4 text-xs">
            <div className="flex justify-between">
              <span className="text-muted">Size</span>
              <span className="font-mono text-primary">{formatSize(file.Size)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted">Last Modified</span>
              <span className="font-mono text-primary">{formatDate(file.LastModified)}</span>
            </div>
            {file.ETag && (
              <div className="flex justify-between">
                <span className="text-muted">ETag</span>
                <span className="truncate font-mono text-primary">
                  {file.ETag.slice(0, 16)}…
                </span>
              </div>
            )}
            <div className="flex flex-col gap-1">
              <span className="text-muted">Full Path</span>
              <span className="break-all font-mono text-primary">{file.Key}</span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-muted">Access URL</span>
              {originUrl ? (
                <code className="break-all rounded bg-fill px-2 py-1 font-mono text-primary">
                  {originUrl}
                </code>
              ) : (
                <span className="text-muted">N/A</span>
              )}
            </div>
          </div>

          {/* Delete confirmation banner */}
          {showDeleteConfirm && (
            <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-danger">
              Are you sure? This action cannot be undone.
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2">
            <button
              onClick={handleCopyUrl}
              disabled={!originUrl}
              className="flex-1 rounded-lg border border-hairline-strong px-3 py-2 text-xs font-medium text-primary transition-all duration-150 hover:border-hairline-strong hover:bg-fill disabled:cursor-not-allowed disabled:opacity-50"
            >
              {copied ? "✓ Copied!" : "📋 Copy URL"}
            </button>
            <button
              onClick={handleDownload}
              disabled={!presignedUrl || loadingPresign}
              className="flex-1 rounded-lg border border-indigo-400/30 px-3 py-2 text-xs font-medium text-accent transition-all duration-150 hover:border-indigo-400/60 hover:bg-indigo-500/10 disabled:cursor-not-allowed disabled:opacity-50"
            >
              ⬇️ Download
            </button>
            <button
              onClick={() => setShareOpen(true)}
              disabled={!presignedUrl || loadingPresign}
              className="flex-1 rounded-lg border border-amber-400/30 px-3 py-2 text-xs font-medium text-amber-300 transition-all duration-150 hover:border-amber-400/60 hover:bg-amber-500/10 disabled:cursor-not-allowed disabled:opacity-50"
            >
              🔗 Share
            </button>
            {!showDeleteConfirm ? (
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="flex-1 rounded-lg border border-red-400/30 px-3 py-2 text-xs font-medium text-danger transition-all duration-150 hover:border-red-400/60 hover:bg-red-500/10"
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
                  <span className="inline-block h-3 w-3 animate-spin rounded-full border border-hairline-strong border-t-white" />
                )}
                {deleting ? "Deleting…" : "Confirm Delete"}
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
    </>
  );
}