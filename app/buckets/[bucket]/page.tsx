"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams, useParams } from "next/navigation";
import { S3Object, S3Bucket } from "@/lib/types";
import { getHeaders } from "@/lib/session";
import { normalizePrefix } from "@/lib/s3-prefix";
import { Breadcrumbs } from "../../components/layout/Breadcrumbs";
import { FileTable } from "../../components/files/FileTable";
import { FileDetailModal } from "../../components/files/FileDetailModal";
import { UploadModal } from "../../components/files/UploadModal";
import { CreateFolderModal } from "../../components/files/CreateFolderModal";
import { useAuth } from "@/context/AuthProvider";
import { useFileList } from "../../hook/useFileList";
import { ErrorBanner } from "../../components/files/ErrorBanner";
import { AclBadge } from "../../components/files/AclBadge";
import { BulkDeleteBar } from "../../components/files/BulkDeleteBar";
import { FolderPlusIcon, UploadIcon } from "../../components/icons/BucketPageIcons";

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function BucketPage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();

  const bucket = typeof params.bucket === "string" ? decodeURIComponent(params.bucket) : "";
  const rawPrefix = searchParams.get("prefix") || "";
  const prefix = rawPrefix ? decodeURIComponent(rawPrefix) : "";

  const { credentials } = useAuth();
  const { files, loading, error, setError, refresh } = useFileList(bucket, prefix, credentials);

  const [bucketInfo, setBucketInfo] = useState<S3Bucket | null>(null);
  const [selectedFile, setSelectedFile] = useState<S3Object | null>(null);
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showCreateFolderModal, setShowCreateFolderModal] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);

  // Fetch bucket ACL info
  useEffect(() => {
    if (!credentials || !bucket) return;
    (async () => {
      try {
        const res = await fetch(`/api/s3/acl?bucket=${encodeURIComponent(bucket)}`, {
          headers: getHeaders(credentials),
        });
        if (res.ok) {
          const data = await res.json();
          setBucketInfo({ Name: bucket, CreationDate: new Date().toISOString(), isPublic: data.isPublic });
        }
      } catch (err) {
        console.error("Failed to fetch bucket info:", err);
      }
    })();
  }, [credentials, bucket]);

  // ── Handlers ────────────────────────────────────────────────────────────────

  const handleFolderClick = (folder: S3Object) => {
    const folderPrefix = folder.Key.endsWith("/") ? folder.Key : `${folder.Key}/`;
    const normalized = normalizePrefix(folderPrefix);
    router.push(`/buckets/${encodeURIComponent(bucket)}?prefix=${encodeURIComponent(normalized)}`);
  };

  const handleFileDeleted = async () => {
    setSelectedFile(null);
    await refresh();
  };

  const toggleSelectFile = (key: string) => {
    setSelectedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const toggleSelectAll = () => {
    setSelectedKeys(
      selectedKeys.size === files.length ? new Set() : new Set(files.map((f: S3Object) => f.Key))
    );
  };

  const handleBulkDelete = async () => {
    if (!credentials || selectedKeys.size === 0) return;
    try {
      setBulkDeleting(true);
      setError(null);

      const results = await Promise.allSettled(
        Array.from(selectedKeys).map((key) =>
          fetch(`/api/s3/object?bucket=${encodeURIComponent(bucket)}&key=${encodeURIComponent(key)}`, {
            method: "DELETE",
            headers: getHeaders(credentials),
          })
        )
      );

      const failedCount = results.filter(
        (r) => r.status === "rejected" || (r.status === "fulfilled" && !r.value.ok)
      ).length;

      if (failedCount > 0) setError(`Failed to delete ${failedCount} item(s)`);

      setSelectedKeys(new Set());
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete items");
    } finally {
      setBulkDeleting(false);
    }
  };

  if (!credentials) return null;

  return (
    <>
      {/* Error banner */}
      {error && <ErrorBanner message={error} onDismiss={() => setError(null)} />}

      {/* Page header */}
      <div className="mb-6">
        <p className="text-[11px] uppercase tracking-[0.08em] text-muted font-mono">{bucket}</p>
        <h1 className="text-2xl font-semibold text-primary mt-0.5">Files</h1>
      </div>

      {/* Toolbar */}
      <div className="mb-6 flex items-center justify-between gap-4 rounded-xl border border-hairline bg-surface px-4 py-3">
        <Breadcrumbs bucket={bucket} prefix={prefix} currentPage="bucket-details" showIcons />

        <div className="flex items-center gap-2 ml-auto">
          {/* ACL badge */}
          {bucketInfo && <AclBadge isPublic={bucketInfo.isPublic ?? false} />}

          <div className="mx-1 h-4 w-px bg-fill-strong" />

          {/* New folder */}
          <button
            onClick={() => setShowCreateFolderModal(true)}
            className="flex items-center gap-1.5 rounded-lg border border-warning/20 bg-warning/8 px-3 py-1.5 text-xs font-medium text-warning transition-all duration-150 hover:border-warning/40 hover:bg-warning/15"
          >
            <FolderPlusIcon />
            New Folder
          </button>

          {/* Upload */}
          <button
            onClick={() => setShowUploadModal(true)}
            className="flex items-center gap-1.5 rounded-lg border border-brand-400/20 bg-brand-500/8 px-3 py-1.5 text-xs font-medium text-accent transition-all duration-150 hover:border-brand-400/40 hover:bg-brand-500/15"
          >
            <UploadIcon />
            Upload
          </button>
        </div>
      </div>

      {/* File table */}
      <FileTable
        files={files}
        loading={loading}
        bucket={bucket}
        credentials={credentials ?? undefined}
        selectedKeys={selectedKeys}
        onToggleSelect={toggleSelectFile}
        onToggleSelectAll={toggleSelectAll}
        onFolderClick={handleFolderClick}
        onFileClick={setSelectedFile}
        onFolderDeleted={handleFileDeleted}
      />

      {/* Bulk delete bar */}
      {selectedKeys.size > 0 && (
        <BulkDeleteBar
          count={selectedKeys.size}
          loading={bulkDeleting}
          onDelete={handleBulkDelete}
          onClear={() => setSelectedKeys(new Set())}
        />
      )}

      {/* File detail modal */}
      {selectedFile && (
        <FileDetailModal
          file={selectedFile}
          bucket={bucket}
          credentials={credentials}
          onClose={() => setSelectedFile(null)}
          onDeleted={handleFileDeleted}
        />
      )}

      {/* Upload modal */}
      <UploadModal
        open={showUploadModal}
        bucket={bucket}
        prefix={prefix}
        credentials={credentials}
        onClose={() => setShowUploadModal(false)}
        onUploaded={refresh}
      />

      {/* Create folder modal */}
      <CreateFolderModal
        open={showCreateFolderModal}
        bucket={bucket}
        prefix={prefix}
        credentials={credentials}
        onClose={() => setShowCreateFolderModal(false)}
        onCreated={refresh}
      />
    </>
  );
}