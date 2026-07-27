/**
 * LoadingSkeleton - Reusable loading state with skeleton UI
 */

"use client";

interface LoadingSkeletonProps {
  count?: number;
}

export function LoadingSkeleton({ count = 5 }: LoadingSkeletonProps) {
  return (
    <div className="space-y-2">
      {Array.from({ length: count }).map((_, index) => (
        <div
          key={`skeleton-${index}`}
          className="grid grid-cols-12 items-center gap-2 border-b border-hairline px-4 py-3"
        >
          <div className="col-span-1 h-5 w-5 animate-pulse rounded bg-fill-strong" />
          <div className="col-span-6 h-3 animate-pulse rounded bg-fill-strong" />
          <div className="col-span-3 h-3 animate-pulse rounded bg-fill" />
          <div className="col-span-2 ml-auto h-3 w-12 animate-pulse rounded bg-fill-strong" />
        </div>
      ))}
    </div>
  );
}
