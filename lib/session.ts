import { S3Credentials } from "./types";

/**
 * ⚠️ DEPRECATED: Storage functions have been removed.
 * Use AuthProvider context + useAuth() hook instead for S3 credentials management.
 * S3 credentials are now stored in-memory only via React Context.
 * 
 * This file now only exports getHeaders utility.
 */

export function getHeaders(creds: S3Credentials): Record<string, string> {
  return {
    "x-s3-endpoint": creds.endpoint,
    "x-s3-access-key": creds.accessKey,
    "x-s3-secret-key": creds.secretKey,
    "x-s3-reject-unauthorized": String(creds.rejectUnauthorized),
  };
}

/**
 * @deprecated Use AuthProvider's setS3Credentials instead
 */
export function saveSession(creds: S3Credentials): void {
  console.warn(
    "saveSession is deprecated. Use AuthProvider's setS3Credentials() instead."
  );
}

/**
 * @deprecated Use AuthProvider's s3Credentials and clearS3Credentials instead
 */
export function loadSession(): S3Credentials | null {
  console.warn(
    "loadSession is deprecated. Use AuthProvider's s3Credentials instead."
  );
  return null;
}

/**
 * @deprecated Use AuthProvider's clearS3Credentials instead
 */
export function clearSession(): void {
  console.warn(
    "clearSession is deprecated. Use AuthProvider's clearS3Credentials() instead."
  );
}
