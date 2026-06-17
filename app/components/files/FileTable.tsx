"use client";

import { S3Object, S3Credentials } from "@/lib/types";
import { EmptyState } from "./EmptyState";
import { FileTableLoading } from "./FileTableLoading";
import { FileTableHeader } from "./FileTableHeader";
import { FileTableBody } from "./FileTableBody";

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
  onToggleSelect = () => {},
  onToggleSelectAll = () => {},
  onFolderClick,
  onFileClick,
  onFolderDeleted,
}: FileTableProps) {
  if (loading) {
    return <FileTableLoading />;
  }

  if (files.length === 0) {
    return <EmptyState type="folder" />;
  }

  return (
    <div className="overflow-hidden rounded-b-xl border border-t-0 border-white/8 bg-[#111118]">
      <FileTableHeader
        selectedCount={selectedKeys.size}
        totalCount={files.length}
        onToggleSelectAll={onToggleSelectAll}
      />
      <FileTableBody
        files={files}
        bucket={bucket || ""}
        credentials={credentials}
        selectedKeys={selectedKeys}
        onToggleSelect={onToggleSelect}
        onFolderClick={onFolderClick}
        onFileClick={onFileClick}
        onDeleted={onFolderDeleted}
      />
    </div>
  );
}
