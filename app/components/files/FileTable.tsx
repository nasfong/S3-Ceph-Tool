"use client";

import { S3Object, S3Credentials } from "@/lib/types";
import { FileRow } from "./FileRow";
import { EmptyState } from "./EmptyState";

type FileTableProps = {
  files: S3Object[];
  loading: boolean;
  bucket?: string;
  credentials?: S3Credentials;
  selectedKeys?: Set<string>;
  onToggleSelect?: (key: string) => void;
  onToggleSelectAll?: () => void;
  onFolderClick: (folder: S3Object) => void;
  onFileClick: (file: S3Object) => void;
  onFolderDeleted?: () => void;
};

export function FileTable({
  files,
  loading,
  bucket,
  credentials,
  selectedKeys = new Set(),
  onToggleSelect,
  onToggleSelectAll,
  onFolderClick,
  onFileClick,
  onFolderDeleted,
}: FileTableProps) {
  if (loading) {
    return (
      <div className="overflow-hidden rounded-b-xl border border-t-0 border-white/8 bg-[#111118]">
        <div className="grid grid-cols-12 border-b border-white/8 px-4 py-2 text-[11px] uppercase tracking-[0.08em] text-[#888899]">
          <span className="col-span-1 flex items-center">
            <input type="checkbox" disabled className="h-4 w-4 rounded border-white/8" />
          </span>
          <span className="col-span-1">Type</span>
          <span className="col-span-5">Filename</span>
          <span className="col-span-3">Last Modified</span>
          <span className="col-span-2 text-right">Size</span>
        </div>
        {Array.from({ length: 5 }).map((_, index) => (
          <div
            key={`file-skeleton-${index}`}
            className="grid grid-cols-12 items-center gap-2 border-b border-white/4 px-4 py-3"
          >
            <div className="col-span-1 h-5 w-5 animate-pulse rounded bg-white/10" />
            <div className="col-span-1 h-5 w-5 animate-pulse rounded bg-white/10" />
            <div className="col-span-5 h-3 animate-pulse rounded bg-white/10" />
            <div className="col-span-3 h-3 animate-pulse rounded bg-white/5" />
            <div className="col-span-2 ml-auto h-3 w-12 animate-pulse rounded bg-white/10" />
          </div>
        ))}
      </div>
    );
  }

  if (files.length === 0) {
    return <EmptyState type="folder" />;
  }

  return (
    <div className="overflow-hidden rounded-b-xl border border-t-0 border-white/8 bg-[#111118]">
      <div className="grid grid-cols-12 border-b border-white/8 px-4 py-2 text-[11px] uppercase tracking-[0.08em] text-[#888899]">
        <span className="col-span-1 flex items-center">
          <input 
            type="checkbox" 
            checked={selectedKeys.size > 0 && selectedKeys.size === files.length}
            onChange={onToggleSelectAll}
            className="h-4 w-4 rounded border-white/8 cursor-pointer"
            title={selectedKeys.size > 0 && selectedKeys.size < files.length ? "Some selected" : "Select all"}
          />
        </span>
        <span className="col-span-1">Type</span>
        <span className="col-span-5">Filename</span>
        <span className="col-span-3">Last Modified</span>
        <span className="col-span-2 text-right">Size</span>
      </div>
      {files.map((file) => (
        <FileRow
          key={file.Key}
          file={file}
          bucket={bucket || ""}
          credentials={credentials ? {
            endpoint: credentials.endpoint,
            accessKey: credentials.accessKey,
            secretKey: credentials.secretKey,
            rejectUnauthorized: credentials.rejectUnauthorized,
          } : undefined}
          isSelected={selectedKeys.has(file.Key)}
          hasSelection={selectedKeys.size > 0}
          onToggleSelect={() => onToggleSelect?.(file.Key)}
          onFolderClick={onFolderClick}
          onFileClick={onFileClick}
          onDeleted={onFolderDeleted}
        />
      ))}
    </div>
  );
}
