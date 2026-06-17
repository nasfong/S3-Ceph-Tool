import { formatSize } from "@/lib/format";
import { CheckIcon, SpinnerIcon } from "../icons/UploadModalIcons";

type UploadFooterProps = {
  itemCount: number;
  totalBytes: number;
  doneCount: number;
  errorCount: number;
  pendingCount: number;
  uploadingCount: number;
  allDone: boolean;
  onCancel: () => void;
  onDone: () => void;
  onStartUpload: () => void;
};

export function UploadFooter({
  itemCount,
  totalBytes,
  doneCount,
  errorCount,
  pendingCount,
  uploadingCount,
  allDone,
  onCancel,
  onDone,
  onStartUpload,
}: UploadFooterProps) {
  return (
    <div className="flex items-center justify-between border-t border-white/6 px-6 py-4">
      {/* stats */}
      <div className="flex items-center gap-3 text-[11px] font-mono text-white/30">
        <span>{itemCount} file{itemCount !== 1 ? "s" : ""}</span>
        <span className="text-white/10">·</span>
        <span>{formatSize(totalBytes)}</span>
        {doneCount > 0 && (
          <>
            <span className="text-white/10">·</span>
            <span className="text-emerald-400/70">{doneCount} done</span>
          </>
        )}
        {errorCount > 0 && (
          <>
            <span className="text-white/10">·</span>
            <span className="text-red-400/70">{errorCount} failed</span>
          </>
        )}
      </div>

      {/* actions */}
      <div className="flex gap-2">
        <button
          onClick={onCancel}
          className="rounded-lg border border-white/8 px-3 py-1.5 text-xs font-medium text-white/40 transition-all duration-150 hover:border-white/20 hover:text-white/70"
        >
          Cancel
        </button>

        {allDone ? (
          <button
            onClick={onDone}
            className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-1.5 text-xs font-semibold text-white transition-all duration-150 hover:bg-emerald-500"
          >
            <CheckIcon />
            Done
          </button>
        ) : (
          <button
            onClick={onStartUpload}
            disabled={pendingCount === 0}
            className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-1.5 text-xs font-semibold text-white transition-all duration-150 hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {uploadingCount > 0 ? (
              <>
                <SpinnerIcon />
                {doneCount}/{itemCount}
              </>
            ) : (
              "Upload All"
            )}
          </button>
        )}
      </div>
    </div>
  );
}
