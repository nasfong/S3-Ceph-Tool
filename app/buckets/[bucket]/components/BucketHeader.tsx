"use client";

import { S3Bucket } from "@/lib/types";
import { Breadcrumbs } from "../../../components/layout/Breadcrumbs";

interface BucketHeaderProps {
  bucket: string;
  prefix: string;
  bucketInfo: S3Bucket | null;
  onCreateFolder: () => void;
  onUpload: () => void;
}

export function BucketHeader({
  bucket,
  prefix,
  bucketInfo,
  onCreateFolder,
  onUpload,
}: BucketHeaderProps) {
  return (
    <>
      <div className="mb-6">
        <p className="text-[11px] uppercase tracking-[0.08em] text-[#888899]">{bucket}</p>
        <h1 className="text-3xl font-semibold text-[#f1f0ff]">Files</h1>
      </div>

      <div className="mb-6 flex items-center justify-between rounded-lg border border-white/8 bg-[#111118] px-4 py-3">
        <Breadcrumbs bucket={bucket} prefix={prefix} currentPage="bucket-details" showIcons={true} />
        <div className="ml-4 flex items-center gap-3">
          <button
            onClick={onCreateFolder}
            className="rounded-lg border border-amber-400/30 bg-amber-500/10 px-3 py-2 text-xs font-medium text-amber-300 transition-all duration-150 hover:border-amber-400/60 hover:bg-amber-500/20"
          >
            📁 Folder
          </button>
          <button
            onClick={onUpload}
            className="rounded-lg border border-indigo-400/30 bg-indigo-500/10 px-3 py-2 text-xs font-medium text-indigo-300 transition-all duration-150 hover:border-indigo-400/60 hover:bg-indigo-500/20"
          >
            ⬆ Upload
          </button>
          {bucketInfo && (
            <div className="flex items-center gap-2">
              <span className="text-[11px] uppercase tracking-[0.08em] text-[#888899]">ACL</span>
              <span
                className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                  bucketInfo.isPublic
                    ? "bg-amber-500/15 text-amber-300"
                    : "bg-green-500/15 text-green-300"
                }`}
              >
                {bucketInfo.isPublic ? "🌐 Public" : "🔒 Private"}
              </span>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
