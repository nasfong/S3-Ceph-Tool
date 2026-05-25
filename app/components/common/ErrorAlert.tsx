/**
 * ErrorAlert - Reusable error display component
 */

"use client";

interface ErrorAlertProps {
  error: string | null;
  onDismiss?: () => void;
}

export function ErrorAlert({ error, onDismiss }: ErrorAlertProps) {
  if (!error) return null;

  return (
    <div className="rounded-lg border-l-4 border-red-500 bg-red-500/10 p-4 text-sm text-red-400">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-medium">Error</p>
          <p className="mt-1 text-red-300">{error}</p>
        </div>
        {onDismiss && (
          <button
            onClick={onDismiss}
            className="text-red-300 hover:text-red-200 transition-colors shrink-0"
            aria-label="Dismiss error"
          >
            ✕
          </button>
        )}
      </div>
    </div>
  );
}
