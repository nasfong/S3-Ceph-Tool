export function formatSize(bytes: number): string {
  if (bytes === 0) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 ** 2) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 ** 3) return `${(bytes / 1024 ** 2).toFixed(1)} MB`;
  return `${(bytes / 1024 ** 3).toFixed(2)} GB`;
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export function getFileExtension(key: string): string {
  const parts = key.split(".");
  return parts.length > 1 ? parts[parts.length - 1].toLowerCase() : "";
}

export function getFileIcon(key: string): string {
  const ext = getFileExtension(key);
  const iconMap: Record<string, string> = {
    pdf: "📕",
    jpg: "🖼️",
    jpeg: "🖼️",
    png: "🖼️",
    gif: "🖼️",
    webp: "🖼️",
    svg: "🖼️",
    zip: "🗜️",
    rar: "🗜️",
    "7z": "🗜️",
    tar: "🗜️",
    gz: "🗜️",
    mp4: "🎞️",
    mov: "🎞️",
    avi: "🎞️",
    mkv: "🎞️",
    mp3: "🎵",
    wav: "🎵",
    flac: "🎵",
    aac: "🎵",
    doc: "📄",
    docx: "📄",
    txt: "📝",
    md: "📝",
    csv: "📊",
    xls: "📊",
    xlsx: "📊",
    json: "⚙️",
    xml: "⚙️",
    yaml: "⚙️",
    yml: "⚙️",
    js: "⚙️",
    ts: "⚙️",
    py: "⚙️",
    java: "⚙️",
    go: "⚙️",
  };
  return iconMap[ext] || "📄";
}
