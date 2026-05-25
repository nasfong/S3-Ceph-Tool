"use client";

import { S3Credentials } from "@/lib/types";
import { Navbar } from "./Navbar";

type PageShellProps = {
  children: React.ReactNode;
  credentials: S3Credentials;
  onLogout: () => void;
};

export function PageShell({ children, credentials, onLogout }: PageShellProps) {
  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white">
      <Navbar credentials={credentials} onLogout={onLogout} />
      <main className="max-w-6xl mx-auto px-6 pt-20 pb-12 scroll-smooth">
        {children}
      </main>
    </div>
  );
}
