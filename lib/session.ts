import { AuthMode, S3Credentials } from "./types";

const MODE_KEY = "s3-auth-mode";
const CREDS_KEY = "s3-credentials";

export function getHeaders(creds: S3Credentials): Record<string, string> {
  return {
    "x-s3-endpoint": creds.endpoint,
    "x-s3-access-key": creds.accessKey,
    "x-s3-secret-key": creds.secretKey,
    "x-s3-reject-unauthorized": String(creds.rejectUnauthorized),
  };
}

export function loadAuthMode(): AuthMode | null {
  if (typeof window === "undefined") return null;
  const mode = sessionStorage.getItem(MODE_KEY);
  return mode === "keycloak" || mode === "credentials" ? mode : null;
}

export function saveAuthMode(mode: AuthMode): void {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(MODE_KEY, mode);
}

export function loadCredentials(): S3Credentials | null {
  if (typeof window === "undefined") return null;
  const raw = sessionStorage.getItem(CREDS_KEY);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw);
    if (
      typeof parsed?.endpoint === "string" &&
      typeof parsed?.accessKey === "string" &&
      typeof parsed?.secretKey === "string"
    ) {
      return {
        endpoint: parsed.endpoint,
        accessKey: parsed.accessKey,
        secretKey: parsed.secretKey,
        rejectUnauthorized: Boolean(parsed.rejectUnauthorized),
      };
    }
  } catch {
    // Corrupt entry — treat as logged out
  }
  return null;
}

export function saveCredentials(creds: S3Credentials): void {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(CREDS_KEY, JSON.stringify(creds));
}

export function clearSession(): void {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(MODE_KEY);
  sessionStorage.removeItem(CREDS_KEY);
}
