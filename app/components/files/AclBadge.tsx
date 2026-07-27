import { GlobeIcon, LockIcon } from "../icons/BucketPageIcons";

export function AclBadge({ isPublic }: { isPublic: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-[10px] uppercase tracking-widest text-muted font-mono">
        ACL
      </span>
      <span
        className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium border ${
          isPublic
          ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-300"
          : "border-amber-500/20 bg-amber-500/10 text-amber-300"
        }`}
      >
        {isPublic ? <GlobeIcon /> : <LockIcon />}
        {isPublic ? "Public" : "Private"}
      </span>
    </div>
  );
}
