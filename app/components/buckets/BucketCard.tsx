"use client";

import { S3Bucket } from "@/lib/types";
import { BucketAclBadge } from "./BucketAclBadge";

type BucketCardProps = {
  bucket: S3Bucket;
  isSelected?: boolean;
  updatingAcl: boolean;
  onClick: () => void;
  onAclToggle?: () => void;
  onDelete?: () => void;
};

function TrashIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-3.5 w-3.5" xmlns="http://www.w3.org/2000/svg">
      <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M10 11v6M14 11v6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function GlobeIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-3 w-3" xmlns="http://www.w3.org/2000/svg">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.5" />
      <path d="M12 3c-2.4 4-2.4 14 0 18M12 3c2.4 4 2.4 14 0 18M3 12h18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-3 w-3" xmlns="http://www.w3.org/2000/svg">
      <rect x="3" y="11" width="18" height="11" rx="2" stroke="currentColor" strokeWidth="1.5" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

type AclToggleProps = {
  isPublic: boolean;
  loading: boolean;
  onToggle: (e: React.MouseEvent) => void;
};

function AclToggle({ isPublic, loading, onToggle }: AclToggleProps) {
  return (
    <button
      onClick={onToggle}
      disabled={loading}
      aria-label={isPublic ? "Make private" : "Make public"}
      className="group/toggle flex items-center gap-2.5 disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer"
    >
      {/* label left */}
      <span
        className={`text-[11px] font-medium font-mono tracking-wide transition-colors duration-200 ${isPublic ? "text-muted" : "text-warning"
          }`}
      >
        <LockIcon />
      </span>

      {/* track */}
      <div
        className={`relative flex h-5 w-9 items-center rounded-full border transition-all duration-300 ${isPublic
            ? "border-emerald-500/40 bg-emerald-500/20"
            : "border-hairline-strong bg-fill"
          }`}
      >
        {/* loading shimmer overlay */}
        {loading && (
          <span className="absolute inset-0 rounded-full overflow-hidden">
            <span className="absolute inset-0 -translate-x-full animate-[shimmer_1s_infinite] bg-linear-to-r from-transparent via-fill-strong to-transparent" />
          </span>
        )}

        {/* thumb */}
        <span
          className={`absolute flex h-3.5 w-3.5 items-center justify-center rounded-full shadow-md transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] ${isPublic
              ? "left-4.5 bg-emerald-400 shadow-emerald-500/40"
              : "left-0.75 bg-fill-strong"
            }`}
        >
          {/* icon inside thumb */}
          {!loading && (
            <span
              className={`transition-all duration-200 ${isPublic ? "text-emerald-900" : "text-secondary"
                }`}
            >
              {isPublic ? <GlobeIcon /> : <LockIcon />}
            </span>
          )}
          {loading && (
            <span className="h-1.5 w-1.5 rounded-full bg-fill-strong animate-pulse" />
          )}
        </span>
      </div>

      {/* label right */}
      <span
        className={`text-[11px] font-medium font-mono tracking-wide transition-colors duration-200 ${isPublic ? "text-success" : "text-muted"
          }`}
      >
        <GlobeIcon />
      </span>
    </button>
  );
}

export function BucketCard({
  bucket,
  isSelected = false,
  updatingAcl,
  onClick,
  onAclToggle,
  onDelete,
}: BucketCardProps) {
  // null/undefined means the policy could not be read with this credential
  const visibilityKnown = typeof bucket.isPublic === "boolean";
  const createdAt = new Date(bucket.CreationDate);
  const formattedDate = createdAt.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

  return (
    <div
      onClick={onClick}
      className={`group relative cursor-pointer rounded-xl border transition-all duration-200 overflow-hidden ${isSelected
          ? "border-brand-500/60 bg-brand-500/6 shadow-[0_0_0_1px_rgba(28,117,188,0.15),0_4px_24px_rgba(28,117,188,0.1)]"
          : "border-hairline bg-surface hover:border-brand-500/30 hover:bg-surface-2 hover:shadow-[0_4px_24px_rgba(0,0,0,0.3)] hover:-translate-y-0.5"
        }`}
    >
      {/* selected left bar */}
      {isSelected && (
        <span className="absolute left-0 top-3 bottom-3 w-0.75 rounded-r-full bg-brand-500" />
      )}

      {/* top shimmer line */}
      <div
        className={`absolute inset-x-0 top-0 h-px transition-opacity duration-200 ${isSelected
            ? "opacity-100 bg-linear-to-r from-transparent via-brand-400/60 to-transparent"
            : "opacity-0 group-hover:opacity-100 bg-linear-to-r from-transparent via-brand-400/30 to-transparent"
          }`}
      />

      <div className="p-5">
        {/* Top: icon + name + date + acl badge */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div
              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border transition-colors duration-200 ${isSelected
                  ? "border-brand-400/30 bg-brand-500/20 text-accent"
                  : "border-hairline bg-fill text-accent group-hover:border-brand-400/20 group-hover:bg-brand-500/10"
                }`}
            >
              📦
            </div>

            <div className="min-w-0">
              <p className="font-mono text-[13px] font-semibold text-primary truncate max-w-40">
                {bucket.Name}
              </p>
              <p className="mt-0.5 font-mono text-[10px] text-muted uppercase tracking-wider">
                {formattedDate}
              </p>
            </div>
          </div>

          <BucketAclBadge isPublic={bucket.isPublic} />
        </div>

        {/* Divider */}
        <div className="border-t border-hairline mb-3" />

        {/* Actions row */}
        <div className="flex items-center justify-between">
          {/* ACL toggle — hidden when we cannot read the policy, since toggling
              would only fail and the current state is unknown anyway. */}
          {visibilityKnown && onAclToggle ? (
            <div className="flex items-center gap-2">
              <AclToggle
                isPublic={bucket.isPublic === true}
                loading={updatingAcl}
                onToggle={(e) => {
                  e.stopPropagation();
                  onAclToggle();
                }}
              />
              <span className="text-[11px] text-muted font-mono">
                {updatingAcl
                  ? "updating…"
                  : bucket.isPublic
                    ? "public access"
                    : "private"}
              </span>
            </div>
          ) : visibilityKnown ? (
            // Toggling disabled — show the current visibility read-only.
            <div className="flex items-center gap-2 text-muted">
              {bucket.isPublic ? <GlobeIcon /> : <LockIcon />}
              <span className="text-[11px] font-mono">
                {bucket.isPublic ? "public access" : "private"}
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-muted">
              <LockIcon />
              <span className="text-[11px] font-mono">
                visibility not available
              </span>
            </div>
          )}

          {/* Delete */}
          {onDelete && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
              aria-label="Delete bucket"
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-hairline bg-fill-faint text-muted transition-all duration-150 hover:border-red-400/40 hover:bg-red-500/10 hover:text-danger"
            >
              <TrashIcon />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}