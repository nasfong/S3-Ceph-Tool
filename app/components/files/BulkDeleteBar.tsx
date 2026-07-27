import { XIcon, TrashIcon, SpinnerIcon } from "../icons/BucketPageIcons";

export function BulkDeleteBar({
  count,
  loading,
  onDelete,
  onClear,
}: {
  count: number;
  loading: boolean;
  onDelete: () => void;
  onClear: () => void;
}) {
  return (
    <div className="mt-4 flex items-center gap-3 rounded-xl border border-indigo-500/20 bg-indigo-500/[0.07] px-4 py-3 backdrop-blur-sm">
      {/* count pill */}
      <span className="inline-flex items-center rounded-full border border-indigo-400/20 bg-indigo-500/15 px-2.5 py-0.5 font-mono text-xs font-semibold text-accent">
        {count}
      </span>
      <span className="text-sm text-indigo-200/70">
        item{count !== 1 ? "s" : ""} selected
      </span>

      <div className="ml-auto flex items-center gap-2">
        <button
          onClick={onClear}
          className="flex items-center gap-1.5 rounded-lg border border-hairline px-3 py-1.5 text-xs font-medium text-secondary transition-all duration-150 hover:border-hairline-strong hover:text-secondary"
        >
          <XIcon />
          Clear
        </button>
        <button
          onClick={onDelete}
          disabled={loading}
          className="flex items-center gap-1.5 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-1.5 text-xs font-medium text-danger transition-all duration-150 hover:border-red-400/50 hover:bg-red-500/20 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? (
            <>
              <SpinnerIcon className="h-3.5 w-3.5" />
              Deleting…
            </>
          ) : (
            <>
              <TrashIcon />
              Delete Selected
            </>
          )}
        </button>
      </div>
    </div>
  );
}
