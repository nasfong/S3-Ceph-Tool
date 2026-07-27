"use client";

import { useRef, useState } from "react";
import { S3Credentials } from "@/lib/types";
import { useUpload } from "@/lib/useUpload";
import { XIcon } from "../icons/UploadModalIcons";
import { UploadDropZone } from "./UploadDropZone";
import { UploadQueue } from "./UploadQueue";
import { UploadFooter } from "./UploadFooter";
import { ErrorAlert } from "../common/ErrorAlert";

type UploadModalProps = {
  open: boolean;
  bucket: string;
  prefix: string;
  credentials: S3Credentials;
  onClose: () => void;
  onUploaded: () => void;
};

export function UploadModal({
  open,
  bucket,
  prefix,
  credentials,
  onClose,
  onUploaded,
}: UploadModalProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const { items, addFiles, startUpload, cancel, remove, clearAll, allDone, errorMessage, totalBytes, doneCount } = useUpload(
    bucket,
    prefix,
    credentials
  );

  if (!open) return null;

  const pendingCount = items.filter((i) => i.status === "pending").length;
  const uploadingCount = items.filter((i) => i.status === "uploading").length;
  const errorCount = items.filter((i) => i.status === "error").length;

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragging(false);
    addFiles(Array.from(e.dataTransfer.files));
  };

  const handleClose = () => {
    clearAll();
    onClose();
  };
  const handleDone = () => {
    onUploaded();
    clearAll();
    onClose();
  };

  const overallProgress =
    items.length > 0 ? Math.round(items.reduce((acc, i) => acc + (i.status === "done" ? 100 : i.progress ?? 0), 0) / items.length) : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-backdrop backdrop-blur-sm p-4">
      <div className="w-full max-w-lg rounded-2xl border border-hairline bg-surface-2 shadow-[0_24px_80px_rgba(0,0,0,0.6)] overflow-hidden">
        {/* ── Header ── */}
        <div className="relative flex items-center justify-between border-b border-hairline px-6 py-4">
          {/* top accent */}
          <div className="absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-brand-500/50 to-transparent" />

          <div>
            <h2 className="text-[15px] font-semibold text-primary">Upload Files</h2>
            <p className="mt-0.5 font-mono text-[10px] uppercase tracking-widest text-muted">
              {bucket}
              {prefix ? ` / ${prefix}` : ""}
            </p>
          </div>

          <button
            onClick={handleClose}
            className="flex h-7 w-7 items-center justify-center rounded-lg border border-hairline text-muted transition-all duration-150 hover:border-hairline-strong hover:text-primary"
          >
            <XIcon className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* ── Body ── */}
        <div className="px-6 py-5">
          {errorMessage && (
            <div className="mb-4">
              <ErrorAlert error={errorMessage} />
            </div>
          )}

          {items.length === 0 ? (
            <UploadDropZone
              dragging={dragging}
              onDragOver={(e) => {
                e.preventDefault();
                setDragging(true);
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={handleDrop}
              onFilesClick={() => fileInputRef.current?.click()}
              onFolderClick={() => folderInputRef.current?.click()}
              fileInputRef={fileInputRef}
              folderInputRef={folderInputRef}
              onFilesChange={(files) => addFiles(Array.from(files))}
              onFolderChange={(files) => addFiles(Array.from(files))}
            />
          ) : (
            <UploadQueue items={items} overallProgress={overallProgress} onCancel={cancel} onRemove={remove} />
          )}
        </div>

        {/* ── Footer ── */}
        {items.length > 0 && (
          <UploadFooter
            itemCount={items.length}
            totalBytes={totalBytes}
            doneCount={doneCount}
            errorCount={errorCount}
            pendingCount={pendingCount}
            uploadingCount={uploadingCount}
            allDone={allDone}
            onCancel={handleClose}
            onDone={handleDone}
            onStartUpload={startUpload}
          />
        )}
      </div>
    </div>
  );
}