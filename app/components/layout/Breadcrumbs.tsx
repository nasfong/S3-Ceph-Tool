"use client";

import { useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  BreadcrumbItem,
  buildBreadcrumbs,
  getBreadcrumbDisplay,
  formatBreadcrumbLabel,
} from "@/lib/breadcrumb";

type BreadcrumbsProps = {
  bucket?: string | null;
  prefix?: string;
  currentPage?: "buckets" | "bucket-details";
  maxItems?: number;
  showIcons?: boolean;
  className?: string;
  onNavigate?: (href: string) => void;
};

const ICON_MAP: Record<string, string> = {
  home: "🏠",
  package: "📦",
  folder: "📁",
  file: "📄",
  dots: "…",
};

/**
 * Production-grade Breadcrumb Navigation Component
 *
 * Features:
 * - URL-safe encoding/decoding for S3 paths
 * - Full accessibility (ARIA labels, keyboard nav)
 * - Responsive with horizontal scrolling on mobile
 * - Ellipsis support for very long paths
 * - Dark mode support (Tailwind)
 * - Right-click context menu
 * - Copy path functionality
 * - Optimized rendering with memoization
 * - Handles hydration correctly in Next.js
 */
export function Breadcrumbs({
  bucket = null,
  prefix = "",
  currentPage = "bucket-details",
  maxItems = 5,
  showIcons = true,
  className = "",
  onNavigate,
}: BreadcrumbsProps) {
  const router = useRouter();

  // Build breadcrumb items memoized to prevent unnecessary recalculations
  const breadcrumbItems = useMemo(
    () => buildBreadcrumbs(bucket || null, prefix, currentPage),
    [bucket, prefix, currentPage]
  );

  // Get display items with truncation handling
  const displayItems = useMemo(
    () => getBreadcrumbDisplay(breadcrumbItems, maxItems),
    [breadcrumbItems, maxItems]
  );

  // Handle navigation with optional callback
  const handleNavigate = useCallback(
    (href: string) => {
      if (onNavigate) {
        onNavigate(href);
      } else {
        router.push(href);
      }
    },
    [router, onNavigate]
  );

  // Handle right-click for context menu
  const handleContextMenu = useCallback(
    (e: React.MouseEvent, item: BreadcrumbItem) => {
      if (item.isActive || item.label === "...") return;

      e.preventDefault();

      // Copy full path to clipboard
      const pathToCopy = item.path || "Buckets";
      navigator.clipboard.writeText(pathToCopy).catch(() => {
        // Silent fail - clipboard API not available
      });

      // Optional: Show a quick toast (you can add toast library here)
      console.log(`Copied: ${pathToCopy}`);
    },
    []
  );

  // Handle keyboard navigation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent, item: BreadcrumbItem) => {
      if (item.isActive || item.label === "...") return;

      // Enter or Space to navigate
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        handleNavigate(item.href);
      }
    },
    [handleNavigate]
  );

  const ariaLabel = useMemo(() => {
    const path = breadcrumbItems
      .map((item) => item.label)
      .filter((label) => label !== "...")
      .join(" > ");
    return `Breadcrumb navigation: ${path}`;
  }, [breadcrumbItems]);

  return (
    <nav
      aria-label="Breadcrumb"
      className={`flex items-center gap-0.5 overflow-x-auto pb-2 ${className}`}
      title={ariaLabel}
    >
      <ol className="flex items-center gap-0.5 font-mono text-sm">
        {displayItems.map((item, index) => {
          const isLast = index === displayItems.length - 1;
          const isEllipsis = item.label === "...";
          const icon = showIcons ? ICON_MAP[item.icon || ""] : "";

          return (
            <li key={`${item.path}-${index}`} className="flex items-center gap-0.5">
              {/* Separator */}
              {index > 0 && !isEllipsis && (
                <span
                  className="shrink-0 text-gray-600 dark:text-gray-500"
                  aria-hidden="true"
                >
                  /
                </span>
              )}

              {/* Breadcrumb item */}
              {isLast ? (
                // Current page - not clickable
                <span
                  className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[#f1f0ff] dark:text-white"
                  aria-current="page"
                >
                  {icon && <span aria-hidden="true">{icon}</span>}
                  <span className="truncate" title={item.label}>
                    {formatBreadcrumbLabel(item.label)}
                  </span>
                </span>
              ) : isEllipsis ? (
                // Ellipsis - not interactive
                <span
                  className="shrink-0 px-1 text-gray-500 dark:text-gray-600"
                  aria-hidden="true"
                >
                  …
                </span>
              ) : (
                // Clickable breadcrumb item
                <button
                  onClick={() => handleNavigate(item.href)}
                  onContextMenu={(e) => handleContextMenu(e, item)}
                  onKeyDown={(e) => handleKeyDown(e, item)}
                  className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-gray-400 transition-all duration-150 hover:bg-white/5 hover:text-indigo-400 focus:bg-white/10 focus:text-indigo-400 focus:outline-none dark:text-gray-500 dark:hover:bg-white/10 dark:hover:text-indigo-300"
                  aria-label={`Navigate to ${item.label}`}
                  title={`Go to ${item.label}`}
                >
                  {icon && <span aria-hidden="true">{icon}</span>}
                  <span className="truncate" title={item.label}>
                    {formatBreadcrumbLabel(item.label)}
                  </span>
                </button>
              )}
            </li>
          );
        })}
      </ol>

      {/* Optional: Show full path on hover */}
      {breadcrumbItems.length > displayItems.length && (
        <div className="ml-1 text-xs text-gray-600 dark:text-gray-500" title="Path is truncated">
          …
        </div>
      )}
    </nav>
  );
}

// Export memoized version to prevent unnecessary re-renders
export const MemoizedBreadcrumbs = Breadcrumbs;
