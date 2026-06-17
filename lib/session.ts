import { S3Credentials } from "./types";

export function getHeaders(creds: S3Credentials): Record<string, string> {
  return {
    "x-s3-endpoint": creds.endpoint,
    "x-s3-access-key": creds.accessKey,
    "x-s3-secret-key": creds.secretKey,
    "x-s3-reject-unauthorized": String(creds.rejectUnauthorized),
  };
}
