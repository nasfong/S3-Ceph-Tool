"use client";

import { Breadcrumbs } from "@/app/components/layout/Breadcrumbs";

type FolderBreadcrumbProps = {
  bucket: string;
  prefix: string;
};

/**
 * @deprecated Use Breadcrumbs component directly instead
 * This component is kept for backward compatibility
 */
export function FolderBreadcrumb({ bucket, prefix }: FolderBreadcrumbProps) {
  return (
    <Breadcrumbs
      bucket={bucket}
      prefix={prefix}
      currentPage="bucket-details"
      showIcons={true}
      className="mb-4"
    />
  );
}
