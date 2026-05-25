"use client";

import { S3Bucket } from "@/lib/types";
import { BucketAclBadge } from "./BucketAclBadge";

type BucketCardProps = {
  bucket: S3Bucket;
  isSelected?: boolean;
  updatingAcl: boolean;
  onClick: () => void;
  onAclToggle: () => void;
  onDelete?: () => void;
};

export function BucketCard({
  bucket,
  isSelected = false,
  updatingAcl,
  onClick,
  onAclToggle,
  onDelete,
}: BucketCardProps) {
  return (
    <div
      onClick={onClick}
      className={`group relative cursor-pointer rounded-xl border bg-[#111118] p-5 transition-all duration-150 ${
        isSelected
          ? "border-[#6366f1]"
          : "border-white/8 hover:-translate-y-0.5 hover:border-indigo-500/50"
      }`}
    >
      {isSelected && (
        <span className="absolute bottom-4 left-0 top-4 w-1 rounded-r bg-[#6366f1]" />
      )}

      <div className="mb-4">
        <div className="mb-1 flex items-center gap-2">
          <span className="text-lg text-indigo-400">📦</span>
          <p className="font-mono text-[15px] font-semibold text-[#f1f0ff]">{bucket.Name}</p>
        </div>
        <p className="font-mono text-[11px] text-[#888899]">
          {new Date(bucket.CreationDate).toLocaleDateString()}
        </p>
      </div>

      <div className="flex items-center justify-between border-t border-white/8 pt-3">
        <BucketAclBadge isPublic={bucket.isPublic || false} />
        <div className="flex gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onAclToggle();
            }}
            disabled={updatingAcl}
            className="inline-flex items-center gap-1.5 rounded-lg border border-white/12 px-3 py-1.5 text-xs font-medium text-[#f1f0ff] transition-all duration-150 hover:border-indigo-400/60 hover:bg-indigo-500/10 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {updatingAcl
              ? "⟳ Updating..."
              : bucket.isPublic
              ? "🔒 Make Private"
              : "🔓 Make Public"}
          </button>
          {onDelete && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
              className="inline-flex items-center gap-1.5 rounded-lg border border-white/12 px-3 py-1.5 text-xs font-medium text-red-400 transition-all duration-150 hover:border-red-400/60 hover:bg-red-500/10"
              aria-label="Delete bucket"
            >
              🗑️<i className="ti ti-trash" aria-hidden />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
