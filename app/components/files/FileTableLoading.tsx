import { FileTableCheckbox } from "./FileTableCheckbox";

export function FileTableLoading() {
  return (
    <div className="overflow-hidden rounded-b-xl border border-t-0 border-hairline bg-surface">
      <div className="grid grid-cols-12 border-b border-hairline px-4 py-2 text-[11px] uppercase tracking-[0.08em] text-muted">
        <span className="col-span-1 flex items-center">
          <FileTableCheckbox checked={false} disabled onChange={() => {}} />
        </span>
        <span className="col-span-1">Type</span>
        <span className="col-span-5">Filename</span>
        <span className="col-span-3">Last Modified</span>
        <span className="col-span-2 text-right">Size</span>
      </div>
      {Array.from({ length: 5 }).map((_, index) => (
        <div
          key={`file-skeleton-${index}`}
          className="grid grid-cols-12 items-center gap-2 border-b border-hairline px-4 py-3"
        >
          <div className="col-span-1 h-5 w-5 animate-pulse rounded bg-fill-strong" />
          <div className="col-span-1 h-5 w-5 animate-pulse rounded bg-fill-strong" />
          <div className="col-span-5 h-3 animate-pulse rounded bg-fill-strong" />
          <div className="col-span-3 h-3 animate-pulse rounded bg-fill" />
          <div className="col-span-2 ml-auto h-3 w-12 animate-pulse rounded bg-fill-strong" />
        </div>
      ))}
    </div>
  );
}
