import { formatSize } from "@/lib/format";

export const STATUS_CONFIG = {
  pending: { label: (size: number) => formatSize(size), color: "text-white/30" },
  uploading: { label: (p: number) => `${p}%`, color: "text-indigo-400" },
  done: { label: () => "Done", color: "text-emerald-400" },
  error: { label: () => "Failed", color: "text-red-400" },
  cancelled: { label: () => "Cancelled", color: "text-white/20" },
} as const;
