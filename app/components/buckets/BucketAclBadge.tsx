"use client";

type BucketAclBadgeProps = {
  isPublic: boolean;
};

export function BucketAclBadge({ isPublic }: BucketAclBadgeProps) {
  if (isPublic) {
    return (
      <span className="rounded-full bg-green-500/15 px-2.5 py-0.5 text-[11px] text-green-400">
        🌐 Public
      </span>
    );
  }
  return (
    <span className="rounded-full bg-amber-500/15 px-2.5 py-0.5 text-[11px] text-amber-400">
      🔒 Private
    </span>
  );
}
