import { S3Object, S3Credentials } from "@/lib/types";
import { FileRow } from "./FileRow";

type FileTableBodyProps = {
  files: S3Object[];
  bucket: string;
  credentials?: S3Credentials;
  selectedKeys: Set<string>;
  onToggleSelect: (key: string) => void;
  onFolderClick: (folder: S3Object) => void;
  onFileClick: (file: S3Object) => void;
  onDeleted?: () => void;
};

export function FileTableBody({
  files,
  bucket,
  credentials,
  selectedKeys,
  onToggleSelect,
  onFolderClick,
  onFileClick,
  onDeleted,
}: FileTableBodyProps) {
  return (
    <>
      {files.map((file) => (
        <FileRow
          key={file.Key}
          file={file}
          bucket={bucket}
          credentials={
            credentials
              ? {
                  endpoint: credentials.endpoint,
                  accessKey: credentials.accessKey,
                  secretKey: credentials.secretKey,
                  rejectUnauthorized: credentials.rejectUnauthorized,
                }
              : undefined
          }
          isSelected={selectedKeys.has(file.Key)}
          hasSelection={selectedKeys.size > 0}
          onToggleSelect={() => onToggleSelect(file.Key)}
          onFolderClick={onFolderClick}
          onFileClick={onFileClick}
          onDeleted={onDeleted}
        />
      ))}
    </>
  );
}
