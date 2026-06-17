import { InputHTMLAttributes } from "react";
import { CloudUploadIcon, FilesIcon, FolderIcon } from "../icons/UploadModalIcons";

type UploadDropZoneProps = {
  dragging: boolean;
  onDragOver: (e: React.DragEvent<HTMLDivElement>) => void;
  onDragLeave: () => void;
  onDrop: (e: React.DragEvent<HTMLDivElement>) => void;
  onFilesClick: () => void;
  onFolderClick: () => void;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  folderInputRef: React.RefObject<HTMLInputElement | null>;
  onFilesChange: (files: FileList) => void;
  onFolderChange: (files: FileList) => void;
};

export function UploadDropZone({
  dragging,
  onDragOver,
  onDragLeave,
  onDrop,
  onFilesClick,
  onFolderClick,
  fileInputRef,
  folderInputRef,
  onFilesChange,
  onFolderChange,
}: UploadDropZoneProps) {
  return (
    <>
      <div
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        className={`relative flex min-h-45 flex-col items-center justify-center rounded-xl border-2 border-dashed transition-all duration-200 select-none overflow-hidden ${
          dragging
            ? "border-indigo-500/70 bg-indigo-500/7"
            : "border-white/8 bg-white/2 hover:border-white/14 hover:bg-white/3"
        }`}
      >
        {/* bg glow when dragging */}
        {dragging && <div className="absolute inset-0 bg-indigo-500/5 backdrop-blur-sm" />}

        <div className={`relative flex flex-col items-center gap-3 transition-transform duration-200 ${dragging ? "scale-105" : ""}`}>
          <div className={`transition-colors duration-200 ${dragging ? "text-indigo-400" : "text-white/20"}`}>
            <CloudUploadIcon />
          </div>
          <div className="text-center">
            <p className="text-sm font-medium text-white/60">
              {dragging ? "Release to add files" : "Drag files or folders here"}
            </p>
            <p className="mt-1 text-xs text-white/25">Any file type · No size limit</p>
          </div>

          {!dragging && (
            <div className="mt-1 flex gap-2">
              <button
                onClick={onFilesClick}
                className="flex items-center gap-1.5 rounded-lg border border-indigo-400/20 bg-indigo-500/10 px-3 py-1.5 text-xs font-medium text-indigo-300 transition-all duration-150 hover:border-indigo-400/40 hover:bg-indigo-500/15"
              >
                <FilesIcon />
                Files
              </button>
              <button
                onClick={onFolderClick}
                className="flex items-center gap-1.5 rounded-lg border border-amber-400/20 bg-amber-500/10 px-3 py-1.5 text-xs font-medium text-amber-300 transition-all duration-150 hover:border-amber-400/40 hover:bg-amber-500/15"
              >
                <FolderIcon />
                Folder
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Hidden file inputs */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        className="hidden"
        onChange={(e) => e.target.files && onFilesChange(e.target.files)}
      />
      <input
        ref={folderInputRef}
        type="file"
        multiple
        style={{ display: "none" }}
        onChange={(e) => e.target.files && onFolderChange(e.target.files)}
        {...({ webkitdirectory: "" } as InputHTMLAttributes<HTMLInputElement>)}
      />
    </>
  );
}
