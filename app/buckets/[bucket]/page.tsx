"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams, useParams } from "next/navigation";
import { S3Credentials, S3Object, S3Bucket } from "@/lib/types";
import { loadSession, clearSession, getHeaders } from "@/lib/session";
import { normalizePrefix } from "@/lib/s3-prefix";
import { PageShell } from "../../components/layout/PageShell";
import { Breadcrumbs } from "../../components/layout/Breadcrumbs";
import { FileTable } from "../../components/files/FileTable";
import { FileDetailModal } from "../../components/files/FileDetailModal";
import { UploadModal } from "../../components/files/UploadModal";
import { CreateFolderModal } from "../../components/files/CreateFolderModal";

export default function BucketPage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const bucket = typeof params.bucket === "string" ? decodeURIComponent(params.bucket) : "";
  // Decode prefix from URL query parameter
  const rawPrefix = searchParams.get("prefix") || "";
  const prefix = rawPrefix ? decodeURIComponent(rawPrefix) : "";

  const [credentials, setCredentials] = useState<S3Credentials | null>(null);
  const [bucketInfo, setBucketInfo] = useState<S3Bucket | null>(null);
  const [files, setFiles] = useState<S3Object[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<S3Object | null>(null);
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showCreateFolderModal, setShowCreateFolderModal] = useState(false);
  const [deletingKeys, setDeletingKeys] = useState<Set<string> | null>(null);

  useEffect(() => {
    const session = loadSession();
    if (!session) {
      router.replace("/");
      return;
    }
    setCredentials(session);
  }, [router]);

  useEffect(() => {
    if (!credentials || !bucket) return;

    const fetchBucketInfo = async () => {
      try {
        const res = await fetch(`/api/s3/acl?bucket=${encodeURIComponent(bucket)}`, {
          headers: getHeaders(credentials),
        });

        if (res.ok) {
          const data = await res.json();
          setBucketInfo({
            Name: bucket,
            CreationDate: new Date().toISOString(),
            isPublic: data.isPublic,
          });
        }
      } catch (err) {
        console.error("Failed to fetch bucket info:", err);
      }
    };

    const fetchFiles = async () => {
      try {
        setLoading(true);
        setError(null);
        const params = new URLSearchParams({
          bucket,
          ...(prefix && { prefix }),
        });

        const res = await fetch(`/api/s3/list?${params}`, {
          headers: getHeaders(credentials),
        });

        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || "Failed to fetch files");
        }

        const data = await res.json();
        setFiles(data.files || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    };

    fetchBucketInfo();
    fetchFiles();
  }, [credentials, bucket, prefix]);

  const handleFolderClick = (folder: S3Object) => {
    // S3 folders are virtual prefixes - ensure proper normalization
    // CommonPrefixes already end with "/" from API, but be defensive
    const folderPrefix = folder.Key.endsWith("/") ? folder.Key : `${folder.Key}/`;
    const normalized = normalizePrefix(folderPrefix);
    
    // IMPORTANT: folder.Key is already the raw S3 key with special chars encoded
    // (e.g., "favicon_io%20%284%29/" for folder "favicon_io (4)/")
    // We need to preserve this encoding when putting in URL
    // Use encodeURIComponent to encode the URL parameter itself
    // console.log('[handleFolderClick]', {
    //   folderKey: folder.Key,
    //   folderPrefix,
    //   normalized,
    //   encodedForUrl: encodeURIComponent(normalized),
    // });
    
    router.push(`/buckets/${encodeURIComponent(bucket)}?prefix=${encodeURIComponent(normalized)}`);
  };

  const handleFileClick = (file: S3Object) => {
    setSelectedFile(file);
  };

  const handleFileDeleted = async () => {
    setSelectedFile(null);
    if (!credentials || !bucket) return;
    
    try {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams({
        bucket,
        ...(prefix && { prefix }),
      });

      const res = await fetch(`/api/s3/list?${params}`, {
        headers: getHeaders(credentials),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to fetch files");
      }

      const data = await res.json();
      setFiles(data.files || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    clearSession();
    router.replace("/");
  };

  const toggleSelectFile = (key: string) => {
    const newSelected = new Set(selectedKeys);
    if (newSelected.has(key)) {
      newSelected.delete(key);
    } else {
      newSelected.add(key);
    }
    setSelectedKeys(newSelected);
  };

  const toggleSelectAll = () => {
    if (selectedKeys.size === files.length) {
      setSelectedKeys(new Set());
    } else {
      setSelectedKeys(new Set(files.map(f => f.Key)));
    }
  };

  const handleBulkDelete = async () => {
    if (!credentials || selectedKeys.size === 0) return;

    try {
      setLoading(true);
      setError(null);
      setDeletingKeys(null);

      // Delete each selected file/folder
      const deletePromises = Array.from(selectedKeys).map(key =>
        fetch(`/api/s3/object?bucket=${encodeURIComponent(bucket)}&key=${encodeURIComponent(key)}`, {
          method: "DELETE",
          headers: getHeaders(credentials),
        })
      );

      const results = await Promise.allSettled(deletePromises);
      
      const failedCount = results.filter(r => r.status === "rejected" || (r.status === "fulfilled" && !r.value.ok)).length;
      
      if (failedCount > 0) {
        setError(`Failed to delete ${failedCount} item(s)`);
      }

      setSelectedKeys(new Set());
      
      // Refresh file list
      const params = new URLSearchParams({
        bucket,
        ...(prefix && { prefix }),
      });

      const res = await fetch(`/api/s3/list?${params}`, {
        headers: getHeaders(credentials),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to fetch files");
      }

      const data = await res.json();
      setFiles(data.files || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete items");
    } finally {
      setLoading(false);
    }
  };

  if (!credentials) return null;

  return (
    <PageShell credentials={credentials} onLogout={handleLogout}>
      {error && (
        <div className="mb-5 rounded-lg border-l-[3px] border-red-500 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      )}

      <div className="mb-6">
        <p className="text-[11px] uppercase tracking-[0.08em] text-[#888899]">{bucket}</p>
        <h1 className="text-3xl font-semibold text-[#f1f0ff]">Files</h1>
      </div>

      <div className="mb-6 flex items-center justify-between rounded-lg border border-white/8 bg-[#111118] px-4 py-3">
        <Breadcrumbs bucket={bucket} prefix={prefix} currentPage="bucket-details" showIcons={true} />
        <div className="ml-4 flex items-center gap-3">
          <button
            onClick={() => setShowCreateFolderModal(true)}
            className="rounded-lg border border-amber-400/30 bg-amber-500/10 px-3 py-2 text-xs font-medium text-amber-300 transition-all duration-150 hover:border-amber-400/60 hover:bg-amber-500/20"
          >
            📁 Folder
          </button>
          <button
            onClick={() => setShowUploadModal(true)}
            className="rounded-lg border border-indigo-400/30 bg-indigo-500/10 px-3 py-2 text-xs font-medium text-indigo-300 transition-all duration-150 hover:border-indigo-400/60 hover:bg-indigo-500/20"
          >
            ⬆ Upload
          </button>
          {bucketInfo && (
            <div className="flex items-center gap-2">
              <span className="text-[11px] uppercase tracking-[0.08em] text-[#888899]">ACL</span>
              <span
                className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                  bucketInfo.isPublic
                    ? "bg-amber-500/15 text-amber-300"
                    : "bg-green-500/15 text-green-300"
                }`}
              >
                {bucketInfo.isPublic ? "🌐 Public" : "🔒 Private"}
              </span>
            </div>
          )}
        </div>
      </div>

      <FileTable
        files={files}
        loading={loading}
        bucket={bucket}
        credentials={credentials || undefined}
        selectedKeys={selectedKeys}
        onToggleSelect={toggleSelectFile}
        onToggleSelectAll={toggleSelectAll}
        onFolderClick={handleFolderClick}
        onFileClick={handleFileClick}
        onFolderDeleted={handleFileDeleted}
      />

      {selectedKeys.size > 0 && (
        <div className="mt-4 flex items-center gap-3 rounded-lg border border-indigo-500/30 bg-indigo-500/10 px-4 py-3">
          <span className="text-sm font-medium text-indigo-300">
            {selectedKeys.size} item{selectedKeys.size > 1 ? "s" : ""} selected
          </span>
          <div className="ml-auto flex gap-2">
            <button
              onClick={() => setSelectedKeys(new Set())}
              className="rounded px-3 py-1 text-xs font-medium text-indigo-300 hover:bg-indigo-500/20 transition-all"
            >
              Clear
            </button>
            <button
              onClick={handleBulkDelete}
              disabled={loading}
              className="rounded bg-red-500/20 px-3 py-1 text-xs font-medium text-red-300 hover:bg-red-500/30 disabled:opacity-50 transition-all"
            >
              {loading ? "Deleting..." : "Delete Selected"}
            </button>
          </div>
        </div>
      )}

      {selectedFile && (
        <FileDetailModal
          file={selectedFile}
          bucket={bucket}
          credentials={credentials}
          onClose={() => setSelectedFile(null)}
          onDeleted={handleFileDeleted}
        />
      )}

      <UploadModal
        open={showUploadModal}
        bucket={bucket}
        prefix={prefix}
        credentials={credentials}
        onClose={() => setShowUploadModal(false)}
        onUploaded={async () => {
          if (!credentials) return;
          try {
            setLoading(true);
            setError(null);
            const params = new URLSearchParams({
              bucket,
              ...(prefix && { prefix }),
            });

            const res = await fetch(`/api/s3/list?${params}`, {
              headers: getHeaders(credentials),
            });

            if (!res.ok) {
              const data = await res.json();
              throw new Error(data.error || "Failed to fetch files");
            }

            const data = await res.json();
            setFiles(data.files || []);
          } catch (err) {
            setError(err instanceof Error ? err.message : "Unknown error");
          } finally {
            setLoading(false);
          }
        }}
      />

      <CreateFolderModal
        open={showCreateFolderModal}
        bucket={bucket}
        prefix={prefix}
        credentials={credentials}
        onClose={() => setShowCreateFolderModal(false)}
        onCreated={async () => {
          if (!credentials) return;
          try {
            setLoading(true);
            setError(null);
            const params = new URLSearchParams({
              bucket,
              ...(prefix && { prefix }),
            });

            const res = await fetch(`/api/s3/list?${params}`, {
              headers: getHeaders(credentials),
            });

            if (!res.ok) {
              const data = await res.json();
              throw new Error(data.error || "Failed to fetch files");
            }

            const data = await res.json();
            setFiles(data.files || []);
          } catch (err) {
            setError(err instanceof Error ? err.message : "Unknown error");
          } finally {
            setLoading(false);
          }
        }}
      />
    </PageShell>
  );
}
