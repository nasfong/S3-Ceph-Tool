import { XIcon } from "../icons/BucketPageIcons";

export function ErrorBanner({
  message,
  onDismiss,
}: {
  message: string;
  onDismiss: () => void;
}) {
  return (
    <div className="mb-5 flex items-start gap-3 rounded-lg border-l-[3px] border-red-500 bg-red-500/10 px-4 py-3">
      <p className="flex-1 text-sm text-red-300">{message}</p>
      <button
        onClick={onDismiss}
        className="mt-0.5 text-red-400/60 hover:text-red-300 transition-colors"
      >
        <XIcon />
      </button>
    </div>
  );
}
