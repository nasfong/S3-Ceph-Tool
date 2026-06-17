import { STATUS_CONFIG } from "../../hook/uploadConfig";
import { FileIcon, XIcon, CheckIcon } from "../icons/UploadModalIcons";

type UploadItem = {
  id: string;
  file: File;
  status: keyof typeof STATUS_CONFIG;
  progress?: number;
};

type UploadQueueItemProps = {
  item: UploadItem;
  onCancel: (id: string) => void;
  onRemove: (id: string) => void;
};

export function UploadQueueItem({ item, onCancel, onRemove }: UploadQueueItemProps) {
  const cfg = STATUS_CONFIG[item.status];
  const statusLabel =
    item.status === "pending"
      ? cfg.label(item.file.size)
      : item.status === "uploading"
        ? cfg.label(item.progress ?? 0)
        : cfg.label(0);

  return (
    <div className="flex items-center gap-3 px-4 py-3 group/row">
      {/* file type icon */}
      <FileIcon type={item.file.type} />

      {/* name + progress */}
      <div className="flex-1 min-w-0">
        <p className="truncate font-mono text-[12px] text-white/80">{item.file.name}</p>

        <div className="mt-1.5 flex items-center gap-2">
          {/* progress bar only when uploading */}
          {item.status === "uploading" && (
            <div className="flex-1 h-0.75 rounded-full bg-white/6 overflow-hidden">
              <div
                className="h-full rounded-full bg-linear-to-r from-indigo-500 to-violet-400 transition-all duration-300"
                style={{ width: `${item.progress}%` }}
              />
            </div>
          )}
          <span className={`text-[11px] font-mono shrink-0 ${cfg.color}`}>{statusLabel}</span>
        </div>
      </div>

      {/* status indicator / action */}
      <div className="shrink-0 flex items-center">
        {item.status === "uploading" && (
          <button
            onClick={() => onCancel(item.id)}
            className="flex h-6 w-6 items-center justify-center rounded-md text-white/20 transition-all duration-150 hover:bg-red-500/10 hover:text-red-400"
            aria-label="Cancel"
          >
            <XIcon className="h-3 w-3" />
          </button>
        )}
        {item.status === "done" && (
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-400">
            <CheckIcon />
          </span>
        )}
        {item.status === "error" && (
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-red-500/15 text-red-400 font-mono text-xs font-bold">
            !
          </span>
        )}
        {(item.status === "pending" || item.status === "cancelled") && (
          <button
            onClick={() => onRemove(item.id)}
            className="flex h-6 w-6 items-center justify-center rounded-md text-white/20 opacity-0 group-hover/row:opacity-100 transition-all duration-150 hover:bg-white/6 hover:text-white/50"
            aria-label="Remove"
          >
            <XIcon className="h-3 w-3" />
          </button>
        )}
      </div>
    </div>
  );
}
