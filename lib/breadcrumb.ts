/**
 * Breadcrumb navigation utilities
 * Handles URL-safe encoding/decoding for S3 paths with special character support
 */

export type BreadcrumbItem = {
  label: string;
  path: string;
  href: string;
  isActive: boolean;
  icon?: string;
};

/**
 * Safely decode S3 path components
 * Handles URL encoding, UTF-8, and special characters
 */
export function decodePathComponent(component: string): string {
  try {
    // Try URL decoding first
    let decoded = decodeURIComponent(component);
    // Handle alternative encodings (+ as space)
    decoded = decoded.replace(/\+/g, " ");
    return decoded;
  } catch {
    // If decoding fails, return as-is
    return component;
  }
}

/**
 * Safely encode S3 path components
 * Ensures URL-safe encoding for S3 paths
 */
export function encodePathComponent(component: string): string {
  // Use encodeURIComponent for proper URL encoding
  // This handles spaces, special chars, unicode properly
  return encodeURIComponent(component);
}

/**
 * Split S3 prefix into navigable segments
 * Handles edge cases like trailing slashes, empty parts
 */
export function splitPath(prefix: string): string[] {
  if (!prefix) return [];
  
  // Remove trailing slashes
  const normalized = prefix.replace(/\/$/, "");
  
  // Split by / and filter empty parts
  return normalized.split("/").filter(Boolean);
}

/**
 * Build complete breadcrumb trail for navigation
 * Supports both bucket list and nested folder navigation
 */
export function buildBreadcrumbs(
  bucket: string | null,
  prefix: string = "",
  currentPage: "buckets" | "bucket-details" = "bucket-details"
): BreadcrumbItem[] {
  const breadcrumbs: BreadcrumbItem[] = [];

  // Root breadcrumb
  breadcrumbs.push({
    label: "Buckets",
    path: "",
    href: "/buckets",
    isActive: !bucket,
    icon: "home",
  });

  // Bucket breadcrumb (only on bucket details page)
  if (bucket && currentPage === "bucket-details") {
    breadcrumbs.push({
      label: bucket,
      path: bucket,
      href: `/buckets/${encodePathComponent(bucket)}`,
      isActive: !prefix,
      icon: "package",
    });

    // Folder breadcrumbs from prefix
    if (prefix) {
      const segments = splitPath(prefix);
      let currentPrefix = "";

      segments.forEach((segment, index) => {
        currentPrefix += `${segment}/`;
        const isLastSegment = index === segments.length - 1;

        breadcrumbs.push({
          label: decodePathComponent(segment),
          path: currentPrefix,
          href: `/buckets/${encodePathComponent(bucket)}?prefix=${encodePathComponent(currentPrefix)}`,
          isActive: isLastSegment,
          icon: isLastSegment && !prefix.endsWith("/") ? "file" : "folder",
        });
      });
    }
  }

  return breadcrumbs;
}

/**
 * Get breadcrumb segments for display
 * Handles truncation and ellipsis for very long paths
 */
export function getBreadcrumbDisplay(
  breadcrumbs: BreadcrumbItem[],
  maxItems: number = 5
): BreadcrumbItem[] {
  if (breadcrumbs.length <= maxItems) {
    return breadcrumbs;
  }

  // Always keep first (home) and last item
  const first = breadcrumbs[0];
  const last = breadcrumbs[breadcrumbs.length - 1];
  const middle = breadcrumbs.slice(1, -1);

  // If we need to truncate, show first, ellipsis item, and last
  return [
    first,
    {
      label: "...",
      path: "",
      href: "#",
      isActive: false,
      icon: "dots",
    },
    ...middle.slice(-(maxItems - 3)),
    last,
  ];
}

/**
 * Format breadcrumb label for display
 * Truncates long labels while preserving readability
 */
export function formatBreadcrumbLabel(
  label: string,
  maxLength: number = 30
): string {
  if (label.length <= maxLength) {
    return label;
  }

  // Try to break at a logical point
  const ext = label.substring(label.lastIndexOf("."));
  const nameWithoutExt = label.substring(0, label.lastIndexOf("."));

  if (ext && ext.length < 10 && nameWithoutExt.length > maxLength - ext.length - 3) {
    const truncated = nameWithoutExt.substring(0, maxLength - ext.length - 3);
    return `${truncated}...${ext}`;
  }

  return `${label.substring(0, maxLength - 3)}...`;
}

/**
 * Parse URL pathname to extract bucket and prefix
 * Works with Next.js App Router routes
 */
export function parsePathname(pathname: string): {
  bucket: string | null;
  prefix: string | null;
} {
  // Match /buckets or /buckets/:bucket
  const bucketMatch = pathname.match(/^\/buckets(?:\/([^/?]+))?/);

  if (!bucketMatch) {
    return { bucket: null, prefix: null };
  }

  const bucket = bucketMatch[1] ? decodeURIComponent(bucketMatch[1]) : null;
  return { bucket, prefix: null };
}

/**
 * Validate S3 path component
 * Ensures no invalid characters for S3 keys
 */
export function isValidPathComponent(component: string): boolean {
  if (!component || component.length === 0) return false;
  if (component === "." || component === "..") return false;
  // S3 allows most characters, but avoid some problematic ones
  return !component.includes("\0");
}

/**
 * Build parent path from current path
 * Useful for "back" navigation
 */
export function getParentPath(prefix: string): string {
  if (!prefix) return "";
  
  const normalized = prefix.replace(/\/$/, "");
  const lastSlash = normalized.lastIndexOf("/");
  
  if (lastSlash === -1) return "";
  
  return normalized.substring(0, lastSlash + 1);
}
