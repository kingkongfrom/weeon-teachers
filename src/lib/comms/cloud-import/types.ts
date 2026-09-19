export type DropboxCloudImport = {
  source: "dropbox";
  name: string;
  url: string;
  bytes?: number;
};

export type GoogleDriveCloudImport = {
  source: "google-drive";
  name: string;
  fileId: string;
  mimeType: string;
  accessToken: string;
  bytes?: number;
};

export type CloudImportRef = DropboxCloudImport | GoogleDriveCloudImport;

export type AttachmentDraft =
  | { kind: "local"; file: File }
  | { kind: "cloud"; ref: CloudImportRef };

export function attachmentDraftKey(item: AttachmentDraft): string {
  if (item.kind === "local") {
    return `local:${item.file.name}:${item.file.size}:${item.file.lastModified}`;
  }
  if (item.ref.source === "dropbox") {
    return `dropbox:${item.ref.url}`;
  }
  return `gdrive:${item.ref.fileId}`;
}

export function attachmentDraftLabel(item: AttachmentDraft): string {
  return item.kind === "local" ? item.file.name : item.ref.name;
}
