"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Navbar } from "../components/layout/Navbar";
import { useAuth } from "@/context/AuthProvider";

export default function BucketsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { credentials, logout } = useAuth();

  useEffect(() => {
    // Redirect to home if no S3 credentials
    if (credentials === null) {
      router.replace("/");
    }
  }, [router, credentials]);

  if (!credentials) return null;

  return (
    <div className="flex flex-col min-h-screen bg-app">
      <Navbar credentials={credentials} onLogout={logout} />
      <main className="flex-1 w-full px-6 py-8 sm:px-8 lg:px-12 mt-20">
        <div className="mx-auto max-w-7xl">
          {children}
        </div>
      </main>
    </div>
  );
}
