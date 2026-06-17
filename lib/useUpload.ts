import { useState, useCallback } from "react";
import { UploadItem, UploadStatus, S3Credentials } from "./types";
import { getHeaders } from "./session";
import { normalizePrefix, encodeS3Component } from "./s3-prefix";

// How many files upload at the same time
const UPLOAD_CONCURRENCY = 3;

export function useUpload(bucket: string, prefix: string, credentials: S3Credentials) {
  const [items, setItems] = useState<UploadItem[]>([]);

  // Patch a single item by id (merges partial updates)
  const updateItem = useCallback((id: string, updates: Partial<UploadItem>) => {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, ...updates } : item))
    );
  }, []);

  // ─── Add files to the queue ──────────────────────────────────────────────────
  // Builds the final S3 key for each file:
  //   encodedPrefix + encodedRelativePath
  // webkitRelativePath preserves folder structure when user uploads a folder.
  const addFiles = useCallback((files: File[]) => {
    // Drop empty files unless it's the only file selected
    const filesToUpload = files.filter((f) => f.size > 0 || files.length === 1);
    if (filesToUpload.length === 0) return;

    // Encode each folder segment in the current prefix
    // e.g. "my folder (3)/" → "my%20folder%20%283%29/"
    const encodedPrefix = normalizePrefix(prefix)
      .split("/")
      .filter(Boolean)
      .map(encodeS3Component)
      .join("/")
      .concat(prefix ? "/" : ""); // keep trailing slash if prefix exists

    const newItems: UploadItem[] = filesToUpload.map((file) => {
      // Use folder-relative path when uploading a directory, otherwise just filename
      const relativePath = file.webkitRelativePath || file.name;

      // Encode every path segment (handles spaces, parens, special chars)
      const encodedPath = relativePath
        .split("/")
        .map((part) => (part ? encodeS3Component(part) : ""))
        .join("/");

      const key = encodedPrefix + encodedPath;
      console.log({ relativePath, encodedPath, key })
      return {
        id: crypto.randomUUID(),
        file,
        key,            // final S3 object key (fully encoded)
        status: "pending" as UploadStatus,
        progress: 0,
      };
    });
    console.log("Adding files to upload queue:", newItems);
    setItems((prev) => [...prev, ...newItems]);
  }, [prefix]);

  // ─── Upload a single item via XHR (supports progress + cancel) ──────────────
  const uploadOne = useCallback(async (item: UploadItem) => {
    updateItem(item.id, { status: "uploading", progress: 0 });

    await new Promise<void>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      const abort = new AbortController();

      // Store controller so cancel() can abort mid-upload
      updateItem(item.id, { abortController: abort });

      // Track upload progress
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
          const msg = tryParseError(xhr.responseText) ?? `HTTP ${xhr.status}`;
          updateItem(item.id, { status: "error", error: msg });
          reject();
        }
      });

      xhr.addEventListener("error", () => {
        updateItem(item.id, { status: "error", error: "Network error" });
        reject();
      });

      xhr.addEventListener("abort", () => {
        updateItem(item.id, { status: "cancelled", progress: 0 });
        resolve(); // cancelled is not a failure
      });

      // Wire AbortController → XHR abort
      abort.signal.addEventListener("abort", () => xhr.abort());

      // Build multipart request
      const formData = new FormData();
      formData.append("file", item.file);
      formData.append("bucket", bucket);
      formData.append("key", item.key);

      const headers = getHeaders(credentials);
      xhr.open("POST", "/api/s3/upload");
      xhr.setRequestHeader("x-s3-endpoint", headers["x-s3-endpoint"] as string);
      xhr.setRequestHeader("x-s3-access-key", headers["x-s3-access-key"] as string);
      xhr.setRequestHeader("x-s3-secret-key", headers["x-s3-secret-key"] as string);
      xhr.setRequestHeader("x-s3-reject-unauthorized", headers["x-s3-reject-unauthorized"] as string);
      xhr.send(formData);
    });
  }, [bucket, credentials, updateItem]);

  // ─── Start uploading all pending items (UPLOAD_CONCURRENCY at a time) ────────
  const startUpload = useCallback(async () => {
    const pending = items.filter((i) => i.status === "pending");
    if (pending.length === 0) return;

    for (let i = 0; i < pending.length; i += UPLOAD_CONCURRENCY) {
      const chunk = pending.slice(i, i + UPLOAD_CONCURRENCY);
      console.log("chunk to upload:", chunk);
      await Promise.allSettled(chunk.map(uploadOne));
    }
  }, [items, uploadOne]);

  // ─── Item management ─────────────────────────────────────────────────────────
  const cancel = useCallback((id: string) => {
    items.find((i) => i.id === id)?.abortController?.abort();
    updateItem(id, { status: "cancelled", progress: 0 });
  }, [items, updateItem]);

  const remove = useCallback((id: string) => setItems((p) => p.filter((i) => i.id !== id)), []);
  const clearDone = useCallback(() => setItems((p) => p.filter((i) => i.status === "pending" || i.status === "uploading")), []);
  const clearAll = useCallback(() => setItems([]), []);

  // ─── Derived state (computed each render, no extra state needed) ──────────────
  const allDone = items.every((i) => ["done", "error", "cancelled"].includes(i.status));
  const hasErrors = items.some((i) => i.status === "error");
  const totalBytes = items.reduce((sum, i) => sum + i.file.size, 0);
  const doneCount = items.filter((i) => i.status === "done").length;

  return { items, addFiles, startUpload, cancel, remove, clearDone, clearAll, allDone, hasErrors, totalBytes, doneCount };
}

// ─── Utility ──────────────────────────────────────────────────────────────────
function tryParseError(responseText: string): string | null {
  try {
    return JSON.parse(responseText)?.error ?? null;
  } catch {
    return null;
  }
}