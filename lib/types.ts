export type AuthMode = "keycloak" | "credentials";

export type S3Credentials = {
  endpoint: string;
  accessKey: string;
  secretKey: string;
  rejectUnauthorized: boolean;
};

export type S3Bucket = {
  Name: string;
  CreationDate: string;
  isPublic?: boolean;
};

export type S3Object = {
  Key: string;
  Size: number;
  LastModified: string;
  ETag?: string;
  ContentType?: string;
  isFolder: boolean;
};

export type BreadcrumbSegment = {
  label: string;
  prefix: string;
};

export type UploadStatus =
  | "pending"
  | "uploading"
  | "finishing"
  | "done"
  | "error"
  | "cancelled";

export type UploadItem = {
  id: string;
  file: File;
  key: string;
  status: UploadStatus;
  progress: number;
  error?: string;
  abortController?: AbortController;
};

export type PermissionLevel = "read-only" | "read-write" | "admin";

export type BucketPermission = {
  bucket: "*" | string;
  permission: PermissionLevel;
};

export type SubCredential = {
  accessKey: string;
  secretKey: string;
  username: string;
  createdAt: string;
  permissions: BucketPermission[];
  isActive: boolean;
};

export type CreateSubCredentialPayload = {
  username: string;
  permissions: BucketPermission[];
};
