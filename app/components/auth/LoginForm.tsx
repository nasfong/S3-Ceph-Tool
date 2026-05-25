"use client";

import { useState } from "react";
import { S3Credentials } from "@/lib/types";

type LoginFormProps = {
  onSuccess: (creds: S3Credentials) => void;
  loading?: boolean;
  error?: string | null;
};

export function LoginForm({ onSuccess, loading = false, error }: LoginFormProps) {
  const [endpoint, setEndpoint] = useState("https://fsgw.sabay.com");
  const [accessKey, setAccessKey] = useState("");
  const [secretKey, setSecretKey] = useState("");
  const [rejectUnauthorized, setRejectUnauthorized] = useState(true);
  const [validating, setValidating] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!endpoint.trim() || !accessKey.trim() || !secretKey.trim()) {
      setValidationError("Please fill in all fields");
      return;
    }

    setValidating(true);
    setValidationError(null);

    try {
      // Validate credentials by testing a simple API call (list buckets)
      const response = await fetch("/api/s3/buckets", {
        method: "GET",
        headers: {
          "x-s3-endpoint": endpoint,
          "x-s3-access-key": accessKey,
          "x-s3-secret-key": secretKey,
          "x-s3-reject-unauthorized": rejectUnauthorized ? "true" : "false",
        },
      });

      if (!response.ok) {
        const data = await response.json();
        // Use the error message from API which now includes user-friendly messages
        const errorMessage = data.error || "Invalid credentials. Please check your endpoint, access key, and secret key.";
        throw new Error(errorMessage);
      }

      // Credentials are valid, call onSuccess
      onSuccess({
        endpoint,
        accessKey,
        secretKey,
        rejectUnauthorized,
      });
    } catch (err) {
      setValidationError(err instanceof Error ? err.message : "Failed to validate credentials");
    } finally {
      setValidating(false);
    }
  };

  return (
    <div className="w-full max-w-xl rounded-2xl border border-white/8 bg-[#111118]/90 p-8 shadow-[0_24px_80px_-32px_rgba(99,102,241,0.55)] sm:p-10">
      <h2 className="text-2xl font-semibold tracking-tight text-[#f1f0ff]">Connect to your S3 endpoint</h2>
      <p className="mt-2 text-sm text-[#888899]">Use your credentials to continue.</p>

      {(error || validationError) && (
        <div className="mt-6 rounded-lg border-l-[3px] border-[#ef4444] bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {validationError || error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="mt-6 space-y-5">
        <div>
          <label className="mb-2 block text-[11px] uppercase tracking-[0.08em] text-[#888899]">
            Endpoint
          </label>
          <input
            type="url"
            value={endpoint}
            onChange={(e) => setEndpoint(e.target.value)}
            placeholder="https://fsgw.sabay.com"
            className="w-full rounded-xl border border-white/8 bg-[#1c1c28] px-4 py-2.5 font-mono text-sm text-[#f1f0ff] outline-none transition-all duration-150 placeholder:text-gray-500 focus:border-[#6366f1] focus:shadow-[0_0_0_3px_rgba(99,102,241,0.2)]"
          />
        </div>

        <div>
          <label className="mb-2 block text-[11px] uppercase tracking-[0.08em] text-[#888899]">
            Access Key
          </label>
          <input
            type="text"
            value={accessKey}
            onChange={(e) => setAccessKey(e.target.value)}
            placeholder="Enter your S3 access key"
            className="w-full rounded-xl border border-white/8 bg-[#1c1c28] px-4 py-2.5 font-mono text-sm text-[#f1f0ff] outline-none transition-all duration-150 placeholder:text-gray-500 focus:border-[#6366f1] focus:shadow-[0_0_0_3px_rgba(99,102,241,0.2)]"
          />
        </div>

        <div>
          <label className="mb-2 block text-[11px] uppercase tracking-[0.08em] text-[#888899]">
            Secret Key
          </label>
          <input
            type="password"
            value={secretKey}
            onChange={(e) => setSecretKey(e.target.value)}
            placeholder="Enter your S3 secret key"
            className="w-full rounded-xl border border-white/8 bg-[#1c1c28] px-4 py-2.5 font-mono text-sm text-[#f1f0ff] outline-none transition-all duration-150 placeholder:text-gray-500 focus:border-[#6366f1] focus:shadow-[0_0_0_3px_rgba(99,102,241,0.2)]"
          />
        </div>

        <div className="flex items-center justify-between rounded-xl border border-white/8 bg-[#1c1c28]/70 px-4 py-3">
          <label htmlFor="rejectUnauthorized" className="text-[11px] uppercase tracking-[0.08em] text-[#888899]">
            Verify SSL Certificate
          </label>
          <button
            id="rejectUnauthorized"
            type="button"
            onClick={() => setRejectUnauthorized((prev) => !prev)}
            className={`relative h-6 w-11 rounded-full border transition-all duration-150 ${
              rejectUnauthorized
                ? "border-indigo-400/60 bg-indigo-500/30"
                : "border-white/15 bg-black/30"
            }`}
            aria-label="Toggle SSL verification"
            aria-pressed={rejectUnauthorized}
          >
            <span
              className={`absolute top-0.5 h-4.5 w-4.5 rounded-full bg-white transition-all duration-150 ${
                rejectUnauthorized ? "left-5.5" : "left-0.5"
              }`}
            />
          </button>
        </div>

        <button
          type="submit"
          disabled={loading || validating}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-linear-to-br from-[#6366f1] to-[#8b5cf6] px-4 py-2.5 text-sm font-semibold text-white transition-all duration-150 hover:-translate-y-px hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {(loading || validating) && (
            <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
          )}
          {validating ? "Validating..." : loading ? "Logging in..." : "Login"}
        </button>
      </form>
    </div>
  );
}
