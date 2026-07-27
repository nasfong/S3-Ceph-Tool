import { FileTableCheckbox } from "./FileTableCheckbox";

type FileTableHeaderProps = {
  selectedCount: number;
  totalCount: number;
  onToggleSelectAll: () => void;
};

export function FileTableHeader({
  selectedCount,
  totalCount,
  onToggleSelectAll,
}: FileTableHeaderProps) {
  const isAllSelected = selectedCount > 0 && selectedCount === totalCount;
  const isSomeSelected = selectedCount > 0 && selectedCount < totalCount;

  return (
    <div className="grid grid-cols-12 border-b border-hairline px-4 py-2 text-[11px] uppercase tracking-[0.08em] text-muted">
      <span className="col-span-1 flex items-center">
        <FileTableCheckbox
          checked={isAllSelected}
          onChange={onToggleSelectAll}
          title={isSomeSelected ? "Some selected" : "Select all"}
        />
      </span>
      <span className="col-span-1">Type</span>
      <span className="col-span-5">Filename</span>
      <span className="col-span-3">Last Modified</span>
      <span className="col-span-2 text-right">Size</span>
    </div>
  );
}
