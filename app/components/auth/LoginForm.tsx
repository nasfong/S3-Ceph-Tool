"use client";

import { useState } from "react";
import { S3Credentials } from "@/lib/types";
import { getHeaders } from "@/lib/session";
import { ENV } from "@/lib/env";

type LoginFormProps = {
  onSuccess: (creds: S3Credentials) => void;
};

export function LoginForm({ onSuccess }: LoginFormProps) {
  const [accessKey, setAccessKey] = useState("");
  const [secretKey, setSecretKey] = useState("");
  const [validating, setValidating] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accessKey.trim() || !secretKey.trim()) {
      setValidationError("Please fill in all fields");
      return;
    }

    const creds: S3Credentials = {
      endpoint: ENV.S3_ENDPOINT,
      accessKey: accessKey.trim(),
      secretKey: secretKey.trim(),
      rejectUnauthorized: ENV.CERTIFICATE,
    };

    setValidating(true);
    setValidationError(null);

    try {
      // Validate credentials by testing a simple API call (list buckets)
      const response = await fetch("/api/s3/buckets", {
        method: "GET",
        headers: getHeaders(creds),
      });

      if (!response.ok) {
        const data = await response.json();
        // Use the error message from API which now includes user-friendly messages
        const errorMessage = data.error || "Invalid credentials. Please check your access key and secret key.";
        throw new Error(errorMessage);
      }

      // Credentials are valid, call onSuccess
      onSuccess(creds);
    } catch (err) {
      setValidationError(err instanceof Error ? err.message : "Failed to validate credentials");
    } finally {
      setValidating(false);
    }
  };

  return (
    <div className="w-full max-w-xl rounded-2xl border border-hairline bg-surface/90 p-8 shadow-[0_24px_80px_-32px_rgba(28,117,188,0.55)] sm:p-10">
      <h2 className="text-2xl font-semibold tracking-tight text-primary">Sign in with access keys</h2>
      <p className="mt-2 text-sm text-muted">
        Connecting to <span className="font-mono text-secondary">{ENV.S3_ENDPOINT}</span>
      </p>

      {validationError && (
        <div className="mt-6 rounded-lg border-l-[3px] border-[#ef4444] bg-red-500/10 px-4 py-3 text-sm text-danger">
          {validationError}
        </div>
      )}

      <form onSubmit={handleSubmit} className="mt-6 space-y-5">
        <div>
          <label className="mb-2 block text-[11px] uppercase tracking-[0.08em] text-muted">
            Access Key
          </label>
          <input
            type="text"
            value={accessKey}
            onChange={(e) => setAccessKey(e.target.value)}
            placeholder="Enter your S3 access key"
            className="w-full rounded-xl border border-hairline bg-surface-3 px-4 py-2.5 font-mono text-sm text-primary outline-none transition-all duration-150 placeholder:text-muted focus:border-[#1c75bc] focus:shadow-[0_0_0_3px_rgba(28,117,188,0.2)]"
          />
        </div>

        <div>
          <label className="mb-2 block text-[11px] uppercase tracking-[0.08em] text-muted">
            Secret Key
          </label>
          <input
            type="password"
            value={secretKey}
            onChange={(e) => setSecretKey(e.target.value)}
            placeholder="Enter your S3 secret key"
            className="w-full rounded-xl border border-hairline bg-surface-3 px-4 py-2.5 font-mono text-sm text-primary outline-none transition-all duration-150 placeholder:text-muted focus:border-[#1c75bc] focus:shadow-[0_0_0_3px_rgba(28,117,188,0.2)]"
          />
        </div>

        <button
          type="submit"
          disabled={validating}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-linear-to-br from-[#1c75bc] to-[#3d93d6] px-4 py-2.5 text-sm font-semibold text-white transition-all duration-150 hover:-translate-y-px hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {validating && (
            <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-hairline-strong border-t-white" />
          )}
          {validating ? "Validating..." : "Login"}
        </button>
      </form>
    </div>
  );
}
