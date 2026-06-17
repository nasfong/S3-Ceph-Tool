import { useCallback, useEffect, useState } from "react";
import { S3Object } from "@/lib/types";
import { getHeaders } from "@/lib/session";

export function useFileList(
  bucket: string,
  prefix: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  credentials: ReturnType<any>
) {
  const [files, setFiles] = useState<S3Object[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!credentials || !bucket) return;
    try {
      setLoading(true);
      setError(null);
      const qs = new URLSearchParams({ bucket, ...(prefix && { prefix }) });
      const res = await fetch(`/api/s3/list?${qs}`, { headers: getHeaders(credentials) });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to fetch files");
      }
      const data = await res.json();
      setFiles(data.files || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, [credentials, bucket, prefix]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { files, loading, error, setError, refresh };
}
