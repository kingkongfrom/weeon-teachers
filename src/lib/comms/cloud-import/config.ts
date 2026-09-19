/** Dropbox Chooser + Google Drive Picker — public app credentials only. */

export const DROPBOX_APP_KEY = process.env.NEXT_PUBLIC_DROPBOX_APP_KEY?.trim() ?? "";

export const GOOGLE_DRIVE_CLIENT_ID =
  process.env.NEXT_PUBLIC_GOOGLE_DRIVE_CLIENT_ID?.trim() ?? "";

export const GOOGLE_DRIVE_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_DRIVE_API_KEY?.trim() ?? "";

export const GOOGLE_DRIVE_APP_ID = process.env.NEXT_PUBLIC_GOOGLE_DRIVE_APP_ID?.trim() ?? "";

export const DROPBOX_CHOOSER_EXTENSIONS = [
  ".pdf",
  ".doc",
  ".docx",
  ".xls",
  ".xlsx",
  ".txt",
  ".jpg",
  ".jpeg",
  ".png",
  ".webp",
  ".gif",
  ".heic",
] as const;

export function isDropboxConfigured(): boolean {
  return DROPBOX_APP_KEY.length > 0;
}

export function isGoogleDriveConfigured(): boolean {
  return GOOGLE_DRIVE_CLIENT_ID.length > 0 && GOOGLE_DRIVE_API_KEY.length > 0;
}
