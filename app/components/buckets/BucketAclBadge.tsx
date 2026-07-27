"use client";

type BucketAclBadgeProps = {
  /** null / undefined when this credential may not read the bucket policy. */
  isPublic?: boolean | null;
};

export function BucketAclBadge({ isPublic }: BucketAclBadgeProps) {
  if (isPublic === true) {
    return (
      <span className="rounded-full bg-green-500/15 px-2.5 py-0.5 text-[11px] text-green-400">
        🌐 Public
      </span>
    );
  }

  if (isPublic === false) {
    return (
      <span className="rounded-full bg-amber-500/15 px-2.5 py-0.5 text-[11px] text-amber-400">
        🔒 Private
      </span>
    );
  }

  // Unknown — saying "Private" here would present a guess as fact.
  return (
    <span
      title="Your credential cannot read this bucket's policy, so its visibility is unknown."
      className="rounded-full bg-fill px-2.5 py-0.5 text-[11px] text-muted"
    >
      — Unknown
    </span>
  );
}
