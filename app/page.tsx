"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { LoginForm } from "./components/auth/LoginForm";
import { useAuth } from "@/context/AuthProvider";

export default function HomePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isChecking, setIsChecking] = useState(true);
  const { authenticated } = useAuth();
  useEffect(() => {
    console.log("authenticated",authenticated)
    if (authenticated) {
      router.replace("/buckets");
    } else {
      setIsChecking(false);
    }
  }, [router, authenticated]);

  const handleLoginSuccess = async () => {
    try {
      setLoading(true);
      setError(null);
      router.push("/buckets");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  if (isChecking) {
    return null;
  }

  return (
    <main className="min-h-screen bg-[#0a0a0f] text-[#f1f0ff]">
      <div className="grid min-h-screen grid-cols-1 lg:grid-cols-5">
        <aside className="relative hidden overflow-hidden border-r border-white/8 bg-[#0a0a0f] lg:col-span-2 lg:flex lg:flex-col lg:justify-between">
          <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(99,102,241,0.25)_1px,transparent_1px),linear-gradient(90deg,rgba(99,102,241,0.25)_1px,transparent_1px)] bg-size-[36px_36px] opacity-25" />
          <div className="relative z-10 p-10">
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
          <LoginForm
            onSuccess={handleLoginSuccess}
            loading={loading}
            error={error}
          />
        </section>
      </div>
    </main>
  );
}
