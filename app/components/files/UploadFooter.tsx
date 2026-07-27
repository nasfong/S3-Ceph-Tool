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
    <div className="flex items-center justify-between border-t border-hairline px-6 py-4">
      {/* stats */}
      <div className="flex items-center gap-3 text-[11px] font-mono text-muted">
        <span>{itemCount} file{itemCount !== 1 ? "s" : ""}</span>
        <span className="text-muted">·</span>
        <span>{formatSize(totalBytes)}</span>
        {doneCount > 0 && (
          <>
            <span className="text-muted">·</span>
            <span className="text-success">{doneCount} done</span>
          </>
        )}
        {errorCount > 0 && (
          <>
            <span className="text-muted">·</span>
            <span className="text-danger/70">{errorCount} failed</span>
          </>
        )}
      </div>

      {/* actions */}
      <div className="flex gap-2">
        <button
          onClick={onCancel}
          className="rounded-lg border border-hairline px-3 py-1.5 text-xs font-medium text-muted transition-all duration-150 hover:border-hairline-strong hover:text-secondary"
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
            className="flex items-center gap-1.5 rounded-lg bg-brand-600 px-4 py-1.5 text-xs font-semibold text-white transition-all duration-150 hover:bg-brand-500 disabled:cursor-not-allowed disabled:opacity-40"
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
