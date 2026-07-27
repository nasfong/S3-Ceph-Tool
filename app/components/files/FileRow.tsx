"use client";

import { useState } from "react";
import { S3Object } from "@/lib/types";
import { formatSize, formatDate, getFileIcon } from "@/lib/format";
import { getFileName } from "@/lib/s3-prefix";
import { TrashIcon } from "../icons/BucketPageIcons";

type FileRowProps = {
  file: S3Object;
  bucket: string;
  credentials?: { endpoint: string; accessKey: string; secretKey: string; rejectUnauthorized: boolean };
  isSelected?: boolean;
  hasSelection?: boolean; // True if ANY items are selected globally
  onToggleSelect?: () => void;
  onFolderClick: (folder: S3Object) => void;
  onFileClick: (file: S3Object) => void;
  onDeleted?: () => void;
};

export function FileRow({ 
  file, 
  bucket, 
  credentials, 
  isSelected = false,
  hasSelection = false,
  onToggleSelect,
  onFolderClick, 
  onFileClick, 
  onDeleted 
}: FileRowProps) {
  const [deleting, setDeleting] = useState(false);

  const handleClick = () => {
    if (file.isFolder) {
      onFolderClick(file);
    } else {
      onFileClick(file);
    }
  };

  const handleDeleteFolder = async (e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (!confirm(`Delete folder "${getFileName(file.Key)}" and all its contents?`)) {
      return;
    }

    setDeleting(true);
    try {
      const response = await fetch("/api/s3/delete-folder", {
        method: "DELETE",
        headers: credentials ? {
          "x-s3-endpoint": credentials.endpoint,
          "x-s3-access-key": credentials.accessKey,
          "x-s3-secret-key": credentials.secretKey,
          "x-s3-reject-unauthorized": credentials.rejectUnauthorized ? "true" : "false",
          "Content-Type": "application/json",
        } : {},
        body: JSON.stringify({
          bucket,
          folderKey: file.Key,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to delete folder");
      }

      onDeleted?.();
    } catch (err) {
      alert(`Error deleting folder: ${err instanceof Error ? err.message : "Unknown error"}`);
    } finally {
      setDeleting(false);
    }
  };

  // Use S3-aware filename extraction that properly handles prefixes and decoding
  const filename = getFileName(file.Key);

  const handleRowClick = (e: React.MouseEvent) => {
    // Don't navigate if clicking on checkbox or delete button
    if ((e.target as HTMLElement).closest('input[type="checkbox"]') || 
        (e.target as HTMLElement).closest('button')) {
      return;
    }
    
    // If any items are selected, clicking toggles selection instead of navigating
    if (hasSelection) {
      onToggleSelect?.();
      return;
    }
    
    // Otherwise, navigate/open modal
    handleClick();
  };

  if (file.isFolder) {
    return (
      <div
        onClick={handleRowClick}
        className={`grid grid-cols-12 items-center border-b border-hairline px-4 py-3 transition-all duration-150 cursor-pointer ${isSelected ? "bg-indigo-500/10" : "hover:bg-fill-faint"}`}
      >
        <span className="col-span-1 flex items-center">
          <input
            type="checkbox"
            checked={isSelected}
            onChange={(e) => {
              e.stopPropagation();
              onToggleSelect?.();
            }}
            className="h-4 w-4 rounded border-hairline cursor-pointer"
          />
        </span>
        <span className="col-span-1 text-base text-amber-400">
          📁
        </span>
        <div className="col-span-5 min-w-0">
          <p className="truncate font-mono text-sm text-primary">{filename}</p>
        </div>
        <p className="col-span-3 truncate font-mono text-xs text-muted">
          —
        </p>
        <button
          onClick={handleDeleteFolder}
          disabled={deleting}
          className="col-span-2 text-right text-danger hover:text-danger disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-end"
          title="Delete folder"
        >
          {deleting ? "Deleting..." : <TrashIcon />}
        </button>
      </div>
    );
  }

  return (
    <div
      onClick={handleRowClick}
      className={`grid grid-cols-12 items-center border-b border-hairline px-4 py-3 transition-all duration-150 cursor-pointer ${isSelected ? "bg-indigo-500/10" : "hover:bg-fill-faint"}`}
    >
      <span className="col-span-1 flex items-center">
        <input
          type="checkbox"
          checked={isSelected}
          onChange={(e) => {
            e.stopPropagation();
            onToggleSelect?.();
          }}
          className="h-4 w-4 rounded border-hairline cursor-pointer"
        />
      </span>
      <span className="col-span-1 text-base">
        {getFileIcon(file.Key)}
      </span>
      <div className="col-span-5 min-w-0">
        <p className="truncate font-mono text-sm text-primary">{filename}</p>
      </div>
      <p className="col-span-3 truncate font-mono text-xs text-muted">
        {formatDate(file.LastModified)}
      </p>
      <span className="col-span-2 text-right font-mono text-xs text-muted">
        {formatSize(file.Size)}
      </span>
    </div>
  );
}
