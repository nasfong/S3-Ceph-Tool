import { S3Credentials } from "./types";

const KEYS = {
  endpoint: "s3_endpoint",
  accessKey: "s3_access_key",
  secretKey: "s3_secret_key",
  rejectUnauthorized: "s3_reject_unauthorized",
} as const;

export function saveSession(creds: S3Credentials): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEYS.endpoint, creds.endpoint);
  localStorage.setItem(KEYS.accessKey, creds.accessKey);
  localStorage.setItem(KEYS.secretKey, creds.secretKey);
  localStorage.setItem(KEYS.rejectUnauthorized, String(creds.rejectUnauthorized));
}

export function loadSession(): S3Credentials | null {
  if (typeof window === "undefined") return null;
  const endpoint = localStorage.getItem(KEYS.endpoint);
  const accessKey = localStorage.getItem(KEYS.accessKey);
  const secretKey = localStorage.getItem(KEYS.secretKey);
  const rejectUnauthorized = localStorage.getItem(KEYS.rejectUnauthorized);

  if (!endpoint || !accessKey || !secretKey) {
    return null;
  }

  return {
    endpoint,
    accessKey,
    secretKey,
    rejectUnauthorized: rejectUnauthorized !== "false",
  };
}

export function clearSession(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(KEYS.endpoint);
  localStorage.removeItem(KEYS.accessKey);
  localStorage.removeItem(KEYS.secretKey);
  localStorage.removeItem(KEYS.rejectUnauthorized);
}

export function getHeaders(creds: S3Credentials): Record<string, string> {
  return {
    "x-s3-endpoint": creds.endpoint,
    "x-s3-access-key": creds.accessKey,
    "x-s3-secret-key": creds.secretKey,
    "x-s3-reject-unauthorized": String(creds.rejectUnauthorized),
  };
}
