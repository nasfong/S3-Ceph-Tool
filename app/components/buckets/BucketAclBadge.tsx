"use client";

type BucketAclBadgeProps = {
  /** null / undefined when this credential may not read the bucket policy. */
  isPublic?: boolean | null;
};

export function BucketAclBadge({ isPublic }: BucketAclBadgeProps) {
  if (isPublic === true) {
    return (
      <span className="rounded-full bg-success/15 px-2.5 py-0.5 text-[11px] text-success">
        🌐 Public
      </span>
    );
  }

  if (isPublic === false) {
    return (
      <span className="rounded-full bg-warning/15 px-2.5 py-0.5 text-[11px] text-warning">
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
