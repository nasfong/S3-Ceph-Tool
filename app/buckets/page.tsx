"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { S3Bucket, S3Credentials } from "@/lib/types";
import { loadSession, clearSession, getHeaders } from "@/lib/session";
import { PageShell } from "../components/layout/PageShell";
import { Breadcrumbs } from "../components/layout/Breadcrumbs";
import { BucketGrid } from "../components/buckets/BucketGrid";
import { CreateBucketModal } from "../components/buckets/CreateBucketModal";
import { DeleteBucketModal } from "../components/buckets/DeleteBucketModal";

export default function BucketsPage() {
  const router = useRouter();
  const [credentials, setCredentials] = useState<S3Credentials | null>(null);
  const [buckets, setBuckets] = useState<S3Bucket[]>([]);
  const [loading, setLoading] = useState(false);
  const [updatingAcl, setUpdatingAcl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [deletingBucket, setDeletingBucket] = useState<S3Bucket | null>(null);

  useEffect(() => {
    const session = loadSession();
    if (!session) {
      router.replace("/");
      return;
    }
    setCredentials(session);
    fetchBucketsAndAcls(session);
  }, [router]);

  const fetchBucketsAndAcls = async (creds: S3Credentials) => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch("/api/s3/buckets", {
        headers: getHeaders(creds),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to fetch buckets");
      }

      const data = await res.json();
      const bucketsWithAcls = await Promise.all(
        (data.buckets || []).map(async (bucket: S3Bucket) => {
          try {
            const aclRes = await fetch(`/api/s3/acl?bucket=${encodeURIComponent(bucket.Name)}`, {
              headers: getHeaders(creds),
            });
            if (aclRes.ok) {
              const aclData = await aclRes.json();
              return { ...bucket, isPublic: aclData.isPublic };
            }
          } catch (err) {
            console.error(`Failed to fetch ACL for ${bucket.Name}:`, err);
          }
          return bucket;
        })
      );
      setBuckets(bucketsWithAcls);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  const handleSelectBucket = (bucketName: string) => {
    router.push(`/buckets/${encodeURIComponent(bucketName)}`);
  };

  const handleBucketAclToggle = async (bucketName: string) => {
    if (!credentials) return;

    try {
      setUpdatingAcl(bucketName);
      setError(null);
      const bucket = buckets.find((b) => b.Name === bucketName);
      const currentIsPublic = bucket?.isPublic || false;
      const newIsPublic = !currentIsPublic;

      const res = await fetch("/api/s3/acl", {
        method: "PUT",
        headers: {
          ...getHeaders(credentials),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          bucket: bucketName,
          isPublic: newIsPublic,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to update bucket ACL");
      }

      setBuckets((prev) =>
        prev.map((b) =>
          b.Name === bucketName ? { ...b, isPublic: newIsPublic } : b
        )
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setUpdatingAcl(null);
    }
  };

  const handleBucketCreated = () => {
    fetchBucketsAndAcls(credentials!);
    setShowCreateModal(false);
  };

  const handleLogout = () => {
    clearSession();
    router.replace("/");
  };

  if (!credentials) return null;

  return (
    <PageShell credentials={credentials} onLogout={handleLogout}>
      {error && (
        <div className="mb-5 rounded-lg border-l-[3px] border-[#ef4444] bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      )}

      {/* Breadcrumb Navigation */}
      <div className="mb-6">
        <Breadcrumbs currentPage="buckets" showIcons={true} />
      </div>

      <div className="mb-6 flex items-center justify-between">
        <div>
          <p className="text-[11px] uppercase tracking-[0.08em] text-[#888899]">Storage</p>
          <h1 className="text-3xl font-semibold text-[#f1f0ff]">Buckets</h1>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowCreateModal(true)}
            className="rounded-lg border border-indigo-400/30 bg-indigo-500/10 px-4 py-2 text-sm font-medium text-indigo-300 transition-all duration-150 hover:border-indigo-400/60 hover:bg-indigo-500/20"
          >
            ➕ New Bucket
          </button>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <div
              key={`bucket-skeleton-${index}`}
              className="animate-pulse rounded-xl border border-white/8 bg-[#111118] p-5"
            >
              <div className="mb-4 h-4 w-2/3 rounded bg-white/10" />
              <div className="mb-6 h-3 w-1/2 rounded bg-white/5" />
              <div className="h-px bg-white/8" />
              <div className="mt-3 flex items-center justify-between">
                <div className="h-5 w-16 rounded-full bg-white/10" />
                <div className="h-7 w-24 rounded-lg bg-white/10" />
              </div>
            </div>
          ))}
        </div>
      ) : buckets.length === 0 ? (
        <div className="rounded-xl border border-white/8 bg-[#111118] px-6 py-12 text-center">
          <p className="text-sm text-[#888899]">No buckets yet. Create one to get started.</p>
        </div>
      ) : (
        <BucketGrid
          buckets={buckets}
          updatingAcl={updatingAcl}
          onSelect={handleSelectBucket}
          onAclToggle={handleBucketAclToggle}
          onDelete={setDeletingBucket}
        />
      )}

      <CreateBucketModal
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreated={handleBucketCreated}
        credentials={credentials}
      />

      {deletingBucket && (
        <DeleteBucketModal
          open={true}
          bucket={deletingBucket}
          credentials={credentials}
          onClose={() => setDeletingBucket(null)}
          onDeleted={(name) => {
            setBuckets((prev) => prev.filter((b) => b.Name !== name));
            setDeletingBucket(null);
          }}
        />
      )}
    </PageShell>
  );
}
