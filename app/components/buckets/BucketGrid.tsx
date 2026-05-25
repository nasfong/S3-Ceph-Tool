"use client";

import { S3Bucket } from "@/lib/types";
import { BucketCard } from "./BucketCard";

type BucketGridProps = {
  buckets: S3Bucket[];
  selectedBucket?: string | null;
  updatingAcl: string | null;
  onSelect: (name: string) => void;
  onAclToggle: (name: string) => void;
  onDelete?: (bucket: S3Bucket) => void;
};

export function BucketGrid({
  buckets,
  selectedBucket,
  updatingAcl,
  onSelect,
  onAclToggle,
  onDelete,
}: BucketGridProps) {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
      {buckets.map((bucket, index) => (
        <div
          key={bucket.Name}
          style={{ transitionDelay: `${index * 60}ms` }}
          className="animate-in fade-in slide-in-from-bottom-2"
        >
          <BucketCard
            bucket={bucket}
            isSelected={selectedBucket === bucket.Name}
            updatingAcl={updatingAcl === bucket.Name}
            onClick={() => onSelect(bucket.Name)}
            onAclToggle={() => onAclToggle(bucket.Name)}
            onDelete={() => onDelete?.(bucket)}
          />
        </div>
      ))}
    </div>
  );
}
