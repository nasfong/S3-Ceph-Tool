import { getHeaders } from "./session";
import { S3Credentials } from "./types";

export function setUploadHeaders(
  xhr: XMLHttpRequest,

  item: { file: File; key: string },
  bucket: string,
  credentials: S3Credentials,
) {
  const headers = getHeaders(credentials);
  // S3 credentials
  xhr.setRequestHeader("x-s3-endpoint", headers["x-s3-endpoint"] as string);
  xhr.setRequestHeader("x-s3-access-key", headers["x-s3-access-key"] as string);
  xhr.setRequestHeader("x-s3-secret-key", headers["x-s3-secret-key"] as string);
  xhr.setRequestHeader(
    "x-s3-reject-unauthorized",
    headers["x-s3-reject-unauthorized"] as string,
  );
  // Header and Body
  xhr.setRequestHeader("x-bucket", bucket);
  xhr.setRequestHeader("x-key", item.key);
  xhr.setRequestHeader("content-type", item.file.type);

  xhr.setRequestHeader("x-file-name", item.file.name);
  xhr.setRequestHeader("x-file-size", String(item.file.size || 0));
  xhr.setRequestHeader("content-type", item.file.type);
}
