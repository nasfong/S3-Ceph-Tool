"use client";

import { useRef, useState, InputHTMLAttributes } from "react";
import { S3Credentials } from "@/lib/types";
import { useUpload } from "@/lib/useUpload";
import { formatSize } from "@/lib/format";

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
  const { items, addFiles, startUpload, cancel, remove, clearAll, allDone, totalBytes, doneCount } =
    useUpload(bucket, prefix, credentials);

  if (!open) return null;

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragging(false);
    addFiles(Array.from(e.dataTransfer.files));
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragging(true);
  };

  const handleDragLeave = () => {
    setDragging(false);
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      addFiles(Array.from(e.target.files));
    }
  };

  const handleFolderInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      addFiles(Array.from(e.target.files));
    }
  };

  const handleUploadClick = async () => {
    await startUpload();
  };

  const handleDone = () => {
    onUploaded();
    clearAll();
    onClose();
  };

  const pendingCount = items.filter((i) => i.status === "pending").length;
  const uploadingCount = items.filter((i) => i.status === "uploading").length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#111118] shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/8 px-6 py-4">
          <h2 className="text-lg font-semibold text-white">Upload files</h2>
          <button
            onClick={() => {
              clearAll();
              onClose();
            }}
            className="text-gray-400 hover:text-white transition-colors"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5">
          {items.length === 0 ? (
            /* Drop zone */
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`min-h-45 rounded-xl border-2 border-dashed flex flex-col items-center justify-center transition-all duration-150 select-none ${dragging
                ? "border-indigo-500 bg-indigo-500/5"
                : "border-white/10 hover:border-white/20 bg-[#1a1a26]"
                }`}
            >
              <i className="ti ti-cloud-upload text-4xl text-gray-600 mb-4" aria-hidden />
              <p className="text-sm text-gray-400 mb-4">Drag files or folders here</p>
              <div className="flex gap-2">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="rounded-lg border border-indigo-400/30 bg-indigo-500/10 px-3 py-2 text-xs font-medium text-indigo-300 hover:border-indigo-400/60 hover:bg-indigo-500/20 transition-all duration-150"
                >
                  📄 Upload Files
                </button>
                <button
                  onClick={() => folderInputRef.current?.click()}
                  className="rounded-lg border border-amber-400/30 bg-amber-500/10 px-3 py-2 text-xs font-medium text-amber-300 hover:border-amber-400/60 hover:bg-amber-500/20 transition-all duration-150"
                >
                  📁 Upload Folder
                </button>
              </div>
              <p className="text-xs text-gray-600 mt-4">Any file type · No size limit</p>
            </div>
          ) : (
            /* Queue */
            <div className="max-h-80 overflow-y-auto">
              {items.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center gap-3 py-3 border-b border-white/8 last:border-b-0"
                >
                  <i
                    className={`ti ti-file text-base text-gray-500 shrink-0`}
                    aria-hidden
                  />

                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white font-mono truncate">{item.file.name}</p>
                    <div className="flex items-center gap-2 mt-1">
                      {item.status === "uploading" && (
                        <div className="flex-1 h-1 bg-white/5 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-indigo-500 rounded-full transition-all duration-300"
                            style={{ width: `${item.progress}%` }}
                          />
                        </div>
                      )}
                      <span className="text-xs font-mono text-gray-500 shrink-0">
                        {item.status === "pending" && formatSize(item.file.size)}
                        {item.status === "uploading" && `${item.progress}%`}
                        {item.status === "done" && <span className="text-green-400">✓</span>}
                        {item.status === "error" && (
                          <span className="text-red-400">Error</span>
                        )}
                        {item.status === "cancelled" && (
                          <span className="text-gray-600">Cancelled</span>
                        )}
                      </span>
                    </div>
                  </div>

                  {item.status === "uploading" && (
                    <button
                      onClick={() => cancel(item.id)}
                      className="text-gray-600 hover:text-red-400 transition-colors shrink-0"
                      aria-label="Cancel"
                    >
                      <i className="ti ti-x" />
                    </button>
                  )}
                  {(item.status === "pending" ||
                    item.status === "error" ||
                    item.status === "cancelled") && (
                      <button
                        onClick={() => remove(item.id)}
                        className="text-gray-600 hover:text-gray-300 transition-colors shrink-0"
                        aria-label="Remove"
                      >
                        <i className="ti ti-x" />
                      </button>
                    )}
                </div>
              ))}
            </div>
          )}

          <input
            ref={fileInputRef}
            type="file"
            multiple
            className="hidden"
            onChange={handleFileInputChange}
          />
          <input
            ref={folderInputRef}
            type="file"
            multiple
            style={{ display: 'none' }}
            onChange={handleFolderInputChange}
            {...({ webkitdirectory: '' } as InputHTMLAttributes<HTMLInputElement>)}
          />
        </div>

        {/* Footer */}
        {items.length > 0 && (
          <div className="flex items-center justify-between border-t border-white/8 px-6 py-4">
            <span className="text-xs text-gray-500">
              {items.length} file{items.length !== 1 ? "s" : ""} · {formatSize(totalBytes)}
              {doneCount > 0 && ` · ${doneCount} uploaded`}
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  clearAll();
                  onClose();
                }}
                className="rounded-lg border border-white/10 hover:border-white/20 px-4 py-2 text-sm font-medium text-gray-300 hover:text-white transition-all duration-150"
              >
                Close
              </button>
              {allDone ? (
                <button
                  onClick={handleDone}
                  className="rounded-lg bg-indigo-600 hover:bg-indigo-500 px-4 py-2 text-sm font-medium text-white transition-all duration-150"
                >
                  Done
                </button>
              ) : (
                <button
                  onClick={handleUploadClick}
                  disabled={items.length === 0 || pendingCount === 0}
                  className="rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed px-4 py-2 text-sm font-medium text-white transition-all duration-150"
                >
                  {uploadingCount > 0
                    ? `Uploading ${doneCount}/${items.length}…`
                    : "Upload All"}
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
