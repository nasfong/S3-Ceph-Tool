"use client";

type EmptyStateProps = {
  type: "bucket" | "folder" | "search";
};

const CONFIG = {
  bucket: { icon: "📂", title: "This bucket is empty", subtitle: "Upload a file to get started" },
  folder: { icon: "📂", title: "This folder is empty", subtitle: "No files here yet" },
  search: { icon: "🔍", title: "No files found", subtitle: "Try adjusting your search" },
};

export function EmptyState({ type }: EmptyStateProps) {
  const config = CONFIG[type];

  return (
    <div className="flex flex-col items-center justify-center rounded-b-xl border border-t-0 border-white/8 bg-[#111118] px-6 py-16 text-center">
      <span className="mb-3 text-5xl opacity-70">{config.icon}</span>
      <p className="text-sm text-[#f1f0ff] font-medium">{config.title}</p>
      <p className="mt-1 text-xs text-[#888899]">{config.subtitle}</p>
    </div>
  );
}
