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
          ? "border-success/20 bg-success/10 text-success"
          : "border-warning/20 bg-warning/10 text-warning"
        }`}
      >
        {isPublic ? <GlobeIcon /> : <LockIcon />}
        {isPublic ? "Public" : "Private"}
      </span>
    </div>
  );
}
