import { UploadQueueItem } from "./UploadQueueItem";
import { STATUS_CONFIG } from "../../hook/uploadConfig";

type UploadItem = {
  id: string;
  file: File;
  status: keyof typeof STATUS_CONFIG;
  progress?: number;
};

type UploadQueueProps = {
  items: UploadItem[];
  overallProgress: number;
  onCancel: (id: string) => void;
  onRemove: (id: string) => void;
};

export function UploadQueue({ items, overallProgress, onCancel, onRemove }: UploadQueueProps) {
  const uploadingCount = items.filter((i) => i.status === "uploading").length;

  return (
    <div className="rounded-xl border border-hairline bg-fill-faint overflow-hidden">
      {/* overall progress bar (only while uploading) */}
      {uploadingCount > 0 && (
        <div className="h-0.75 w-full bg-fill">
          <div
            className="h-full bg-linear-to-r from-indigo-500 to-violet-500 transition-all duration-500"
            style={{ width: `${overallProgress}%` }}
          />
        </div>
      )}

      <div className="max-h-72 overflow-y-auto divide-y divide-hairline">
        {items.map((item) => (
          <UploadQueueItem key={item.id} item={item} onCancel={onCancel} onRemove={onRemove} />
        ))}
      </div>
    </div>
  );
}
