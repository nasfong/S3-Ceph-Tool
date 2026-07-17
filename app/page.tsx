"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { LoginForm } from "./components/auth/LoginForm";
import { useAuth } from "@/context/AuthProvider";
import { S3Credentials } from "@/lib/types";

export default function HomePage() {
  const router = useRouter();
  const [showKeyForm, setShowKeyForm] = useState(false);
  const { authenticated, loginWithKeycloak, loginWithCredentials } = useAuth();

  useEffect(() => {
    if (authenticated) {
      router.replace("/buckets");
    }
  }, [router, authenticated]);

  const handleLoginSuccess = (creds: S3Credentials) => {
    loginWithCredentials(creds);
    router.push("/buckets");
  };

  if (authenticated) {
    return null;
  }

  return (
    <main className="min-h-screen bg-[#0a0a0f] text-[#f1f0ff]">
      <div className="grid min-h-screen grid-cols-1 lg:grid-cols-5">
        <aside className="relative hidden overflow-hidden border-r border-white/8 bg-[#0a0a0f] lg:col-span-2 lg:flex lg:flex-col lg:justify-between">
          <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(99,102,241,0.25)_1px,transparent_1px),linear-gradient(90deg,rgba(99,102,241,0.25)_1px,transparent_1px)] bg-size-[36px_36px] opacity-25" />
          <div className="relative z-10 p-10">
            <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl border border-indigo-400/30 bg-indigo-500/10">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/favicon.svg" alt="S3 Browser logo" className="h-7 w-7" />
            </div>
            <p className="mb-3 text-xs uppercase tracking-[0.08em] text-gray-500">S3 Browser</p>
            <h1 className="text-4xl font-semibold tracking-tight text-transparent bg-clip-text bg-linear-to-r from-[#a78bfa] to-[#6366f1]">
              S3 Browser
            </h1>
            <p className="mt-4 max-w-sm text-sm text-gray-400">
              Your S3 storage, beautifully simple.
            </p>
          </div>
          <pre className="relative z-10 p-10 text-[11px] leading-relaxed text-indigo-300/70 font-mono">
            {`╭─────────────────────────────────────────╮
│   ◉───────◉────────◉───────◉          │
│   │       │        │       │          │
│   ◉──◉────◉──◉─────◉──◉────◉          │
│      │          │          │          │
│   ◉──┴──────◉───┴──────◉───◉          │
│                                         │
│        object storage topology          │
╰─────────────────────────────────────────╯`}
          </pre>
        </aside>

        <section className="relative flex items-center justify-center bg-[#111118] px-6 py-12 lg:col-span-3">
          {showKeyForm ? (
            <div className="w-full max-w-xl">
              <LoginForm onSuccess={handleLoginSuccess} />
              <button
                type="button"
                onClick={() => setShowKeyForm(false)}
                className="mt-6 w-full text-center text-sm text-[#888899] transition-colors duration-150 hover:text-[#a5a4c0]"
              >
                ← Back to sign-in options
              </button>
            </div>
          ) : (
            <div className="w-full max-w-xl rounded-2xl border border-white/8 bg-[#111118]/90 p-8 shadow-[0_24px_80px_-32px_rgba(99,102,241,0.55)] sm:p-10">
              <h2 className="text-2xl font-semibold tracking-tight text-[#f1f0ff]">Sign in</h2>
              <p className="mt-2 text-sm text-[#888899]">
                Continue with your Sabay account, or connect using S3 access keys.
              </p>

              <button
                type="button"
                onClick={loginWithKeycloak}
                className="mt-8 flex w-full items-center justify-center gap-2 rounded-xl bg-linear-to-br from-[#6366f1] to-[#8b5cf6] px-4 py-2.5 text-sm font-semibold text-white transition-all duration-150 hover:-translate-y-px hover:brightness-110"
              >
                Continue with Keycloak
              </button>

              <div className="my-6 flex items-center gap-4">
                <span className="h-px flex-1 bg-white/8" />
                <span className="text-[11px] uppercase tracking-[0.08em] text-[#888899]">or</span>
                <span className="h-px flex-1 bg-white/8" />
              </div>

              <button
                type="button"
                onClick={() => setShowKeyForm(true)}
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-white/8 bg-[#1c1c28] px-4 py-2.5 text-sm font-medium text-[#f1f0ff] transition-all duration-150 hover:border-indigo-400/60 hover:bg-[#22222f]"
              >
                Use S3 access keys
              </button>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
