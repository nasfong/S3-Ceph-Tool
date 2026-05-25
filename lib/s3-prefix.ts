/**
 * S3/Ceph Virtual Folder Utilities
 * 
 * S3/Ceph does NOT have real folders - they are virtual prefixes.
 * This module provides utilities to properly handle S3 prefix-based navigation.
 * 
 * Key Concepts:
 * - Folders are just prefixes that end with "/"
 * - CommonPrefixes from ListObjectsV2 represent folders
 * - Contents represent actual files/objects
 * - Delimiter "/" treats "/" as folder boundary
 */

/**
 * Normalize S3 prefix to ensure it ends with "/"
 * - Empty/null prefixes return ""
 * - Prefixes without "/" get "/" appended
 * - Multiple trailing slashes are normalized to single "/"
 * 
 * @example
 * normalizePrefix("folder") → "folder/"
 * normalizePrefix("folder/") → "folder/"
 * normalizePrefix("") → ""
 * normalizePrefix(null) → ""
 */
export function normalizePrefix(prefix: string | null | undefined): string {
  if (!prefix) return "";
  
  // Remove all trailing slashes first
  let normalized = prefix.replace(/\/+$/, "");
  
  // If not empty, add single trailing slash
  if (normalized) {
    normalized += "/";
  }
  
  return normalized;
}

/**
 * Build S3 path from bucket and prefix
 * Returns the full object key prefix for API calls
 * 
 * @example
 * buildS3Path("file.txt", "") → "file.txt"
 * buildS3Path("file.txt", "docs/") → "docs/file.txt"
 * buildS3Path("file.txt", "docs/reports/") → "docs/reports/file.txt"
 */
export function buildS3Path(
  key: string,
  prefix: string = ""
): string {
  if (!prefix) return key;
  
  const normalized = normalizePrefix(prefix);
  return `${normalized}${key}`;
}

/**
 * Parse S3 path into segments
 * Handles URL decoding and normalization
 * 
 * @example
 * parseS3Path("folder-a/folder-b/file.txt") 
 * → ["folder-a", "folder-b", "file.txt"]
 * 
 * parseS3Path("") → []
 */
export function parseS3Path(path: string): string[] {
  if (!path) return [];
  
  return path
    .split("/")
    .filter((segment) => segment.length > 0)
    .map((segment) => decodeURIComponent(segment));
}

/**
 * Join S3 path segments
 * Properly handles encoding and slash placement
 * 
 * @example
 * joinS3Prefix(["folder-a", "folder-b"]) → "folder-a/folder-b/"
 * joinS3Prefix(["folder-a", "folder-b"], false) → "folder-a/folder-b"
 */
export function joinS3Prefix(
  segments: string[],
  includeTrailingSlash: boolean = true
): string {
  if (!segments.length) return "";
  
  const encoded = segments.map((s) => encodeURIComponent(s)).join("/");
  
  return includeTrailingSlash ? `${encoded}/` : encoded;
}

/**
 * Get folder name from S3 path
 * Extracts the folder name from a prefix path
 * 
 * @example
 * getFolderName("folder-a/folder-b/") → "folder-b"
 * getFolderName("folder-a/") → "folder-a"
 * getFolderName("") → ""
 */
export function getFolderName(prefix: string): string {
  if (!prefix) return "";
  
  // Remove trailing slashes
  const cleaned = prefix.replace(/\/+$/, "");
  
  // Get last segment
  const segments = cleaned.split("/").filter(Boolean);
  
  return segments.length > 0 ? segments[segments.length - 1] : "";
}

/**
 * Get parent prefix from current prefix
 * Navigates up one folder level
 * 
 * @example
 * getParentPrefix("folder-a/folder-b/folder-c/") → "folder-a/folder-b/"
 * getParentPrefix("folder-a/") → ""
 * getParentPrefix("") → ""
 */
export function getParentPrefix(prefix: string): string {
  if (!prefix) return "";
  
  // Remove trailing slashes
  const cleaned = prefix.replace(/\/+$/, "");
  
  // Find last slash
  const lastSlash = cleaned.lastIndexOf("/");
  
  if (lastSlash === -1) return "";
  
  // Return everything up to and including the last slash
  return `${cleaned.substring(0, lastSlash)}/`;
}

/**
 * Check if a path is a folder (virtual prefix)
 * Folders end with "/" or their isFolder property is true
 * 
 * @example
 * isFolder("folder-a/") → true
 * isFolder("file.txt") → false
 */
export function isFolder(key: string): boolean {
  return key.endsWith("/");
}

/**
 * Extract just the filename from a full S3 key
 * Removes the prefix path and returns only the filename
 * 
 * @example
 * getFileName("folder-a/folder-b/file.txt") → "file.txt"
 * getFileName("file.txt") → "file.txt"
 * getFileName("folder-a/folder-b/") → "folder-b"
 */
export function getFileName(key: string): string {
  if (!key) return "";
  
  // Remove trailing slash if present
  const cleaned = key.endsWith("/") ? key.slice(0, -1) : key;
  
  // Get last segment
  const parts = cleaned.split("/");
  const filename = parts[parts.length - 1];
  
  return filename ? decodeURIComponent(filename) : "";
}

/**
 * Get folder path from a full object key
 * Extracts just the prefix part, excluding the filename
 * 
 * @example
 * getFolderPath("folder-a/folder-b/file.txt") → "folder-a/folder-b/"
 * getFolderPath("file.txt") → ""
 * getFolderPath("folder-a/folder-b/") → "folder-a/folder-b/"
 */
export function getFolderPath(key: string): string {
  if (!key) return "";
  
  // Remove trailing slash for consistent processing
  const cleaned = key.endsWith("/") ? key : key;
  
  const lastSlash = cleaned.lastIndexOf("/");
  
  if (lastSlash === -1) return "";
  
  // Return everything up to and including the last slash
  return cleaned.substring(0, lastSlash + 1);
}

/**
 * Breadcrumb items from prefix
 * Builds navigable breadcrumb trail from current prefix
 * 
 * @example
 * buildPrefixBreadcrumbs("folder-a/folder-b/")
 * → [
 *     { label: "folder-a", prefix: "folder-a/" },
 *     { label: "folder-b", prefix: "folder-a/folder-b/" }
 *   ]
 */
export function buildPrefixBreadcrumbs(
  prefix: string
): Array<{ label: string; prefix: string }> {
  if (!prefix) return [];
  
  const segments = parseS3Path(prefix);
  const breadcrumbs: Array<{ label: string; prefix: string }> = [];
  let currentPrefix = "";
  
  segments.forEach((segment) => {
    currentPrefix = `${currentPrefix}${encodeURIComponent(segment)}/`;
    breadcrumbs.push({
      label: segment,
      prefix: currentPrefix,
    });
  });
  
  return breadcrumbs;
}

/**
 * Validate S3 path component
 * Ensures path component is safe for S3
 * 
 * @example
 * isValidPathComponent("folder") → true
 * isValidPathComponent("") → false
 * isValidPathComponent(".") → false (reserved)
 */
export function isValidPathComponent(component: string): boolean {
  if (!component || component.length === 0) return false;
  if (component === "." || component === "..") return false;
  // S3 allows most characters - just avoid null bytes
  return !component.includes("\0");
}

/**
 * Check if prefix needs trailing slash for folder listing
 * ListObjectsV2 with Delimiter requires prefix to end with "/"
 * 
 * @example
 * needsTrailingSlash("folder") → true
 * needsTrailingSlash("folder/") → false
 * needsTrailingSlash("") → false
 */
export function needsTrailingSlash(prefix: string): boolean {
  if (!prefix) return false;
  return !prefix.endsWith("/");
}

/**
 * Encode S3 path component safely
 * Uses encodeURIComponent for URL safety
 * 
 * @example
 * encodeS3Component("My Folder") → "My%20Folder"
 * encodeS3Component("папка") → "%D1%84%D0%BF%D0%B0%D0%BF%D0%BA%D0%B0"
 */
export function encodeS3Component(component: string): string {
  return encodeURIComponent(component);
}

/**
 * Decode S3 path component safely
 * Handles UTF-8 and special characters
 * 
 * @example
 * decodeS3Component("My%20Folder") → "My Folder"
 * decodeS3Component("%D1%84%D0%BF%D0%B0%D0%BF%D0%BA%D0%B0") → "папка"
 */
export function decodeS3Component(component: string): string {
  try {
    return decodeURIComponent(component);
  } catch {
    // If decoding fails, return as-is
    return component;
  }
}

/**
 * Compare S3 paths case-insensitively
 * S3 keys are case-sensitive but some use cases need case-insensitive comparison
 * 
 * @example
 * isSamePath("folder/file.txt", "FOLDER/FILE.TXT", false) → false
 * isSamePath("folder/file.txt", "folder/file.txt", true) → true
 */
export function isSamePath(
  path1: string,
  path2: string,
  caseSensitive: boolean = true
): boolean {
  if (caseSensitive) {
    return path1 === path2;
  }
  return path1.toLowerCase() === path2.toLowerCase();
}

/**
 * Sort S3 objects with folders first
 * Maintains alphabetical order within each group
 * 
 * @example
 * const sorted = sortS3Objects([
 *   { Key: "b-file.txt", isFolder: false },
 *   { Key: "a-folder/", isFolder: true },
 *   { Key: "c-file.txt", isFolder: false }
 * ]);
 * // Result: [a-folder/, b-file.txt, c-file.txt]
 */
export function sortS3Objects<T extends { Key: string; isFolder: boolean }>(
  objects: T[]
): T[] {
  return [
    ...objects
      .filter((obj) => obj.isFolder)
      .sort((a, b) => a.Key.localeCompare(b.Key)),
    ...objects
      .filter((obj) => !obj.isFolder)
      .sort((a, b) => a.Key.localeCompare(b.Key)),
  ];
}
