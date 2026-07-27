"use client";

import { S3Credentials } from "@/lib/types";
import { useState, useEffect } from "react";
import { ThemeToggle } from "./ThemeToggle";

type NavbarProps = {
  credentials: S3Credentials;
  onLogout: () => void;
};

export function Navbar({ credentials, onLogout }: NavbarProps) {
  const [scrolled, setScrolled] = useState(false);
  const [logoutHover, setLogoutHover] = useState(false);

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 8);
    window.addEventListener("scroll", handler, { passive: true });
    return () => window.removeEventListener("scroll", handler);
  }, []);

  const shortEndpoint = credentials.endpoint
    .replace(/^https?:\/\//, "")
    .replace(/\/$/, "");

  return (
    <div
      className={`fixed inset-x-0 top-0 z-40 transition-all duration-300 ${scrolled
          ? "border-b border-hairline bg-navbar-scrolled shadow-[0_8px_32px_rgba(0,0,0,0.4)] backdrop-blur-2xl"
          : "border-b border-transparent bg-navbar backdrop-blur-xl"
        }`}
    >
      {/* top accent line */}
      <div className="absolute inset-x-0 top-0 h-[1.5px] bg-linear-to-r from-transparent via-brand-500/60 to-transparent" />

      <div className="mx-auto flex h-15 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">

        {/* ── Left: Logo ── */}
        <div className="flex items-center gap-3 select-none">
          <div className="relative flex h-8 w-8 items-center justify-center">
            <div className="absolute inset-0 rounded-lg bg-brand-500/20 blur-sm" />
            <div className="relative flex h-8 w-8 items-center justify-center rounded-lg border border-brand-400/30 bg-brand-500/10">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/favicon.svg" alt="S3 Browser logo" className="h-5 w-5" />
            </div>
          </div>
          <div className="flex flex-col leading-none">
            <span className="text-[13px] font-semibold tracking-tight text-primary">
              S3 Browser
            </span>
            <span className="mt-0.5 text-[10px] uppercase tracking-[0.12em] text-muted font-mono">
              Storage Console
            </span>
          </div>
        </div>

        {/* ── Center: Endpoint pill ── */}
        <div className="absolute left-1/2 -translate-x-1/2 hidden md:flex items-center gap-2 rounded-full border border-hairline bg-fill px-3.5 py-1.5 max-w-[38%]">
          {/* live dot */}
          <span className="relative flex h-1.5 w-1.5 shrink-0">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
          </span>
          <span className="truncate font-mono text-[11px] text-primary">
            {shortEndpoint}
          </span>
        </div>

        {/* ── Right: User + Logout ── */}
        <div className="flex items-center gap-2.5">
          {/* access key badge */}
          <div className="hidden sm:flex flex-col items-end leading-none">
            <span className="text-[10px] text-muted uppercase tracking-widest font-mono">
              Access Key
            </span>
            <span className="mt-0.5 font-mono text-[11px] text-secondary">
              {(credentials.accessKey || "").slice(0, 8)}
              <span className="text-muted">••••</span>
            </span>
          </div>

          {/* divider */}
          <div className="mx-1 hidden sm:block h-5 w-px bg-fill-strong" />

          {/* theme toggle */}
          <ThemeToggle />

          {/* logout */}
          <button
            onClick={onLogout}
            onMouseEnter={() => setLogoutHover(true)}
            onMouseLeave={() => setLogoutHover(false)}
            className="group relative flex items-center gap-1.5 overflow-hidden rounded-lg border border-red-500/20 bg-red-500/5 px-3 py-1.5 text-xs font-medium text-danger transition-all duration-200 hover:border-red-400/50 hover:bg-red-500/15 hover:text-danger active:scale-95"
          >
            {/* sweep shimmer on hover */}
            <span
              className={`absolute inset-0 -translate-x-full bg-linear-to-r from-transparent via-red-400/10 to-transparent transition-transform duration-500 ${logoutHover ? "translate-x-full" : ""
                }`}
            />
            <svg
              className="relative h-3.5 w-3.5 transition-transform duration-200 group-hover:-translate-x-0.5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
              />
            </svg>
            <span className="relative">Logout</span>
          </button>
        </div>
      </div>
    </div>
  );
}