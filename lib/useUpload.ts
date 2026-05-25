import { useState, useCallback } from "react";
import { UploadItem, UploadStatus, S3Credentials } from "./types";
import { getHeaders } from "./session";
import { normalizePrefix, encodeS3Component } from "./s3-prefix";

export function useUpload(bucket: string, prefix: string, credentials: S3Credentials) {
  const [items, setItems] = useState<UploadItem[]>([]);

  const updateItem = useCallback((id: string, updates: Partial<UploadItem>) => {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, ...updates } : item))
    );
  }, []);

  const addFiles = useCallback((files: File[]) => {
    // Normalize prefix to ensure it ends with "/" (or is empty for root)
    const normalizedPrefix = normalizePrefix(prefix);
    
    // IMPORTANT: The prefix passed here is DECODED (e.g., "favicon_io (3)/")
    // But S3 keys use encoded folder names (e.g., "favicon_io%20%283%29/")
    // We need to encode each folder component in the prefix
    const prefixParts = normalizedPrefix.split('/').filter(p => p);
    const encodedPrefixParts = prefixParts.map(part => encodeS3Component(part));
    const encodedPrefix = encodedPrefixParts.length > 0 
      ? encodedPrefixParts.join('/') + '/' 
      : '';
    
    console.log('[useUpload] Prefix encoding:', {
      inputPrefix: prefix,
      normalizedPrefix,
      prefixParts,
      encodedPrefixParts,
      encodedPrefix,
    });
    
    // Filter out files with 0 size (except for actual empty files we want to keep)
    // Only skip if there are no files at all
    const filesToUpload = files.filter(f => f.size > 0 || files.length <= 1);
    
    if (filesToUpload.length === 0) {
      console.warn('[useUpload] No files to upload (all files are empty)');
      return;
    }
    
    const newItems: UploadItem[] = filesToUpload.map((file) => {
      // Support folder uploads with relative paths (webkitRelativePath)
      // webkitRelativePath is only set when uploading folders via webkitdirectory
      const webkitPath = (file as File).webkitRelativePath;
      const filePath = webkitPath || file.name;
      const isFolderUpload = Boolean(webkitPath);
      
      // Split path and encode each component separately
      // Keep track of each part to ensure proper encoding
      const pathParts = filePath.split('/');
      const encodedParts = pathParts.map((part: string) => {
        // Don't filter empty strings - they're part of the path structure
        if (!part) return '';
        return encodeS3Component(part);
      });
      
      // Join parts, handling empty strings (for path separators)
      const encodedPath = encodedParts.join('/');
      
      // Build S3 key: encoded prefix + encoded folder structure + encoded filename
      // Use encodedPrefix which already has properly encoded folder names
      const finalKey = encodedPrefix ? `${encodedPrefix}${encodedPath}` : encodedPath;
      
      // Debug logging with more detail
      console.log('[useUpload] File:', {
        fileName: file.name,
        filePath,
        pathParts,
        encodedParts,
        isFolderUpload,
        webkitPath,
        encodedPath,
        prefix,
        normalizedPrefix,
        encodedPrefix,
        finalKey,
        size: file.size,
        type: file.type || 'unknown',
      });
      
      return {
        id: crypto.randomUUID(),
        file,
        key: finalKey,
        status: "pending" as UploadStatus,
        progress: 0,
      };
    });
    
    console.log('[useUpload] Added files:', { 
      count: newItems.length, 
      totalSize: newItems.reduce((sum, item) => sum + item.file.size, 0),
    });
    setItems((prev) => [...prev, ...newItems]);
  }, [prefix]);

  const cancel = useCallback((id: string) => {
    const item = items.find((i) => i.id === id);
    if (item?.abortController) {
      item.abortController.abort();
    }
    updateItem(id, { status: "cancelled", progress: 0 });
  }, [items, updateItem]);

  const remove = useCallback((id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const clearDone = useCallback(() => {
    setItems((prev) =>
      prev.filter((item) => item.status !== "done" && item.status !== "error" && item.status !== "cancelled")
    );
  }, []);

  const clearAll = useCallback(() => {
    setItems([]);
  }, []);

  const uploadOne = useCallback(
    async (item: UploadItem) => {
      updateItem(item.id, { status: "uploading", progress: 0 });

      try {
        // Upload via server proxy using FormData for progress tracking
        await new Promise<void>((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          const abort = new AbortController();
          updateItem(item.id, { abortController: abort });

          xhr.upload.addEventListener("progress", (e) => {
            if (e.lengthComputable) {
              updateItem(item.id, { progress: Math.round((e.loaded / e.total) * 100) });
            }
          });

          xhr.addEventListener("load", () => {
            if (xhr.status >= 200 && xhr.status < 300) {
              updateItem(item.id, { status: "done", progress: 100 });
              resolve();
            } else {
              try {
                const data = JSON.parse(xhr.responseText);
                updateItem(item.id, { status: "error", error: data.error || `HTTP ${xhr.status}` });
              } catch {
                updateItem(item.id, { status: "error", error: `HTTP ${xhr.status}` });
              }
              reject();
            }
          });

          xhr.addEventListener("error", () => {
            updateItem(item.id, { status: "error", error: "Network error" });
            reject();
          });

          xhr.addEventListener("abort", () => {
            updateItem(item.id, { status: "cancelled", progress: 0 });
            resolve();
          });

          abort.signal.addEventListener("abort", () => {
            xhr.abort();
          });

          // Build FormData with file and metadata
          const formData = new FormData();
          formData.append("file", item.file);
          formData.append("bucket", bucket);
          formData.append("key", item.key);

          // Get headers for authentication
          const headers = getHeaders(credentials);

          // Open request BEFORE setting headers
          xhr.open("POST", "/api/s3/upload");

          // Set auth headers after opening
          xhr.setRequestHeader("x-s3-endpoint", headers["x-s3-endpoint"] as string);
          xhr.setRequestHeader("x-s3-access-key", headers["x-s3-access-key"] as string);
          xhr.setRequestHeader("x-s3-secret-key", headers["x-s3-secret-key"] as string);
          xhr.setRequestHeader("x-s3-reject-unauthorized", headers["x-s3-reject-unauthorized"] as string);

          xhr.send(formData);
        });
      } catch (err) {
        console.error("Upload error:", err);
      }
    },
    [bucket, credentials, updateItem]
  );

  const startUpload = useCallback(async () => {
    const pending = items.filter((i) => i.status === "pending");
    if (pending.length === 0) return;

    const concurrency = 3;
    for (let i = 0; i < pending.length; i += concurrency) {
      const chunk = pending.slice(i, i + concurrency);
      await Promise.allSettled(chunk.map((item) => uploadOne(item)));
    }
  }, [items, uploadOne]);

  const allDone = items.every((i) => i.status === "done" || i.status === "error" || i.status === "cancelled");
  const hasErrors = items.some((i) => i.status === "error");
  const totalBytes = items.reduce((sum, i) => sum + i.file.size, 0);
  const doneCount = items.filter((i) => i.status === "done").length;

  return {
    items,
    addFiles,
    startUpload,
    cancel,
    remove,
    clearDone,
    clearAll,
    allDone,
    hasErrors,
    totalBytes,
    doneCount,
  };
}
