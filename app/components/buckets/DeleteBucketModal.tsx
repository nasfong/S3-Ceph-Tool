"use client";

import { useState } from "react";
import { S3Bucket, S3Credentials } from "@/lib/types";
import { getHeaders } from "@/lib/session";

type DeleteBucketModalProps = {
  open: boolean;
  bucket: S3Bucket;
  credentials: S3Credentials;
  onClose: () => void;
  onDeleted: (bucketName: string) => void;
};

type Stage = "confirm" | "loading" | "success" | "notEmpty" | "error";

export function DeleteBucketModal({
  open,
  bucket,
  credentials,
  onClose,
  onDeleted,
}: DeleteBucketModalProps) {
  const [stage, setStage] = useState<Stage>("confirm");
  const [confirmInput, setConfirmInput] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  // Permission failures can't be retried, so they read differently
  const [denied, setDenied] = useState(false);

  if (!open) return null;

  const handleDelete = async (force: boolean) => {
    setStage("loading");
    try {
      const res = await fetch(
        `/api/s3/buckets/${encodeURIComponent(bucket.Name)}${force ? "?force=true" : ""}`,
        {
          method: "DELETE",
          headers: getHeaders(credentials),
        }
      );

      const data = await res.json();

      if (!res.ok) {
        if (data.bucketNotEmpty && !force) {
          setStage("notEmpty");
        } else {
          setErrorMessage(data.error || "Unknown error");
          setDenied(Boolean(data.denied));
          setStage("error");
        }
        return;
      }

      setStage("success");
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Network error");
      setStage("error");
    }
  };

  const handleDone = () => {
    onDeleted(bucket.Name);
    onClose();
  };

  const handleReset = () => {
    setStage("confirm");
    setConfirmInput("");
    setErrorMessage("");
    setDenied(false);
  };

  const handleClose = () => {
    handleReset();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#111118] shadow-2xl">
        {/* Confirm stage */}
        {stage === "confirm" && (
          <>
            <div className="px-6 py-8 text-center">
              <i className="ti ti-trash text-4xl text-red-500 mb-4 block" aria-hidden />
              <h2 className="text-xl font-semibold text-white mb-2">Delete &quot;{bucket.Name}&quot;?</h2>
              <p className="text-sm text-gray-400 mb-6">
                This will permanently delete the bucket and all of its contents.
              </p>

              <p className="text-xs text-gray-500 uppercase tracking-widest mb-3">
                Type the bucket name to confirm:
              </p>
              <input
                type="text"
                value={confirmInput}
                onChange={(e) => setConfirmInput(e.target.value)}
                placeholder={bucket.Name}
                className="w-full rounded-lg bg-[#1a1a26] border border-white/8 px-3 py-2 text-sm font-mono text-white placeholder-gray-600 focus:border-indigo-500 focus:outline-none focus:shadow-[0_0_0_3px_rgba(99,102,241,0.2)]"
              />
            </div>

            <div className="flex gap-3 border-t border-white/8 px-6 py-4">
              <button
                onClick={handleClose}
                className="flex-1 rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-white hover:bg-white/10 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(false)}
                disabled={confirmInput !== bucket.Name}
                className="flex-1 rounded-lg bg-red-600 hover:bg-red-500 disabled:opacity-50 disabled:cursor-not-allowed px-4 py-2 text-sm font-medium text-white transition-colors"
              >
                Delete bucket
              </button>
            </div>
          </>
        )}

        {/* Loading stage */}
        {stage === "loading" && (
          <div className="px-6 py-8 text-center">
            <i className="ti ti-loader-2 animate-spin text-4xl text-red-500 mb-4 block" aria-hidden />
            <h2 className="text-lg font-semibold text-white mb-2">Deleting &quot;{bucket.Name}&quot;…</h2>
            <p className="text-sm text-gray-400">
              Removing all objects, please wait. This may take a moment for large buckets.
            </p>
            <p className="text-xs text-gray-600 mt-4">Do not close this window</p>
          </div>
        )}

        {/* Success stage */}
        {stage === "success" && (
          <>
            <div className="px-6 py-8 text-center">
              <i className="ti ti-circle-check text-4xl text-green-500 mb-4 block" aria-hidden />
              <h2 className="text-lg font-semibold text-white mb-2">Bucket deleted</h2>
              <p className="text-sm text-gray-400">
                &quot;{bucket.Name}&quot; has been permanently removed.
              </p>
            </div>

            <div className="flex justify-end gap-3 border-t border-white/8 px-6 py-4">
              <button
                onClick={handleDone}
                className="rounded-lg bg-indigo-600 hover:bg-indigo-500 px-4 py-2 text-sm font-medium text-white transition-colors"
              >
                Done
              </button>
            </div>
          </>
        )}

        {/* Not empty stage */}
        {stage === "notEmpty" && (
          <>
            <div className="px-6 py-8 text-center">
              <i className="ti ti-alert-triangle text-4xl text-amber-500 mb-4 block" aria-hidden />
              <h2 className="text-lg font-semibold text-white mb-2">Bucket contains files</h2>
              <p className="text-sm text-gray-400 mb-6">
                &quot;{bucket.Name}&quot; has objects that must be removed before deletion.
              </p>

              <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 mb-6 text-left">
                <p className="text-xs font-semibold text-amber-200 mb-2">Two options:</p>
                <ul className="text-xs text-amber-200 space-y-1">
                  <li>• <span className="font-semibold">Cancel</span> and manually delete files first</li>
                  <li>• <span className="font-semibold">Force Delete</span> to empty the bucket and delete it</li>
                </ul>
              </div>

              <p className="text-xs text-amber-300">⚠ Force Delete will erase all contents permanently</p>
            </div>

            <div className="flex gap-3 border-t border-white/8 px-6 py-4">
              <button
                onClick={handleClose}
                className="flex-1 rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-white hover:bg-white/10 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(true)}
                className="flex-1 rounded-lg bg-red-600 hover:bg-red-500 px-4 py-2 text-sm font-medium text-white transition-colors"
              >
                Force Delete
              </button>
            </div>
          </>
        )}

        {/* Error stage */}
        {stage === "error" && (
          <>
            <div className="px-6 py-8 text-center">
              <i
                className={`ti ${denied ? "ti-lock" : "ti-alert-triangle"} text-4xl ${denied ? "text-amber-500" : "text-red-500"} mb-4 block`}
                aria-hidden
              />
              <h2 className="text-lg font-semibold text-white mb-2">
                {denied ? "Permission denied" : "Failed to delete bucket"}
              </h2>
              <p className={`text-sm text-gray-400 wrap-break-word ${denied ? "" : "font-mono"}`}>
                {errorMessage}
              </p>
              {denied && (
                <p className="mt-3 text-xs text-gray-500">
                  Ask an administrator to grant delete access for this bucket.
                </p>
              )}
            </div>

            <div className="flex gap-3 border-t border-white/8 px-6 py-4">
              <button
                onClick={handleClose}
                className="flex-1 rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-white hover:bg-white/10 transition-colors"
              >
                Close
              </button>
              {/* Retrying a permission failure would just fail again */}
              {!denied && (
                <button
                  onClick={handleReset}
                  className="flex-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 px-4 py-2 text-sm font-medium text-white transition-colors"
                >
                  Try again
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
