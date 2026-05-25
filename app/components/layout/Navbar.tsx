"use client";

import { S3Credentials } from "@/lib/types";

type NavbarProps = {
  credentials: S3Credentials;
  onLogout: () => void;
};

export function Navbar({ credentials, onLogout }: NavbarProps) {
  return (
    <div className="fixed inset-x-0 top-0 z-40 border-b border-white/8 bg-[rgba(10,10,15,0.85)] backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-3">
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-indigo-400/40 bg-indigo-500/20 text-indigo-300 text-lg">
            ⬡
          </span>
          <div>
            <p className="text-sm font-semibold text-white">S3 Browser</p>
            <p className="text-[11px] uppercase tracking-[0.08em] text-[#888899]">Developer Storage Tool</p>
          </div>
        </div>

        <code className="hidden max-w-[40%] truncate rounded-full border border-white/8 bg-[#111118] px-3 py-1 text-xs text-indigo-200 font-mono md:block">
          {credentials.endpoint}
        </code>

        <div className="flex items-center gap-3">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/12 bg-[#1c1c28] text-xs font-semibold text-indigo-200 font-mono">
            {(credentials.accessKey?.[0] || "U").toUpperCase()}
          </span>
          <button
            onClick={onLogout}
            className="rounded-lg border border-red-400/30 px-3 py-1.5 text-xs font-medium text-red-300 transition-all duration-150 hover:border-red-400/60 hover:bg-red-500/10 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Logout
          </button>
        </div>
      </div>
    </div>
  );
}
