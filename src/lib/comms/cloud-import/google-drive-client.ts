// @ts-nocheck
import {
  GOOGLE_DRIVE_API_KEY,
  GOOGLE_DRIVE_APP_ID,
  GOOGLE_DRIVE_CLIENT_ID,
  isGoogleDriveConfigured,
} from "@/lib/comms/cloud-import/config";
import { loadScript } from "@/lib/comms/cloud-import/load-script";
import type { GoogleDriveCloudImport } from "@/lib/comms/cloud-import/types";

type GooglePickerDoc = {
  id: string;
  name: string;
  mimeType: string;
  sizeBytes?: number;
};

type GooglePickerResponse = {
  action: string;
  docs?: GooglePickerDoc[];
};

declare global {
  interface Window {
    google?: {
      accounts?: {
        oauth2?: {
          initTokenClient: (config: {
            client_id: string;
            scope: string;
            callback: (response: { access_token?: string; error?: string }) => void;
          }) => { requestAccessToken: (options?: { prompt?: string }) => void };
        };
      };
      picker?: {
        Action: { PICKED: string; CANCEL: string };
        DocsView: new () => {
          setIncludeFolders: (include: boolean) => unknown;
          setSelectFolderEnabled: (enabled: boolean) => unknown;
        };
        PickerBuilder: new () => {
          addView: (view: unknown) => unknown;
          setOAuthToken: (token: string) => unknown;
          setDeveloperKey: (key: string) => unknown;
          setAppId: (appId: string) => unknown;
          setMaxItems: (max: number) => unknown;
          setCallback: (callback: (data: GooglePickerResponse) => void) => unknown;
          build: () => { setVisible: (visible: boolean) => void };
        };
      };
    };
    gapi?: {
      load: (name: string, config: { callback: () => void }) => void;
    };
  }
}

const DRIVE_READONLY_SCOPE = "https://www.googleapis.com/auth/drive.readonly";

async function ensureGooglePicker(): Promise<void> {
  if (!isGoogleDriveConfigured()) {
    throw new Error("google_drive_not_configured");
  }

  await Promise.all([
    loadScript("https://accounts.google.com/gsi/client"),
    loadScript("https://apis.google.com/js/api.js"),
  ]);

  await new Promise<void>((resolve, reject) => {
    if (!window.gapi?.load) {
      reject(new Error("gapi_unavailable"));
      return;
    }
    window.gapi.load("picker", {
      callback: () => resolve(),
    });
  });

  if (!window.google?.picker || !window.google.accounts?.oauth2) {
    throw new Error("google_picker_unavailable");
  }
}

function requestAccessToken(): Promise<string> {
  return new Promise((resolve, reject) => {
    const tokenClient = window.google!.accounts!.oauth2!.initTokenClient({
      client_id: GOOGLE_DRIVE_CLIENT_ID,
      scope: DRIVE_READONLY_SCOPE,
      callback: (response) => {
        if (response.error || !response.access_token) {
          reject(new Error(response.error ?? "google_auth_failed"));
          return;
        }
        resolve(response.access_token);
      },
    });
    tokenClient.requestAccessToken({ prompt: "" });
  });
}

function openPicker(accessToken: string, maxFiles: number): Promise<GoogleDriveCloudImport[]> {
  return new Promise((resolve) => {
    const view = new window.google!.picker!.DocsView();
    view.setIncludeFolders(false);
    view.setSelectFolderEnabled(false);

    let builder = new window.google!.picker!.PickerBuilder()
      .addView(view)
      .setOAuthToken(accessToken)
      .setDeveloperKey(GOOGLE_DRIVE_API_KEY)
      .setMaxItems(Math.max(1, maxFiles));

    if (GOOGLE_DRIVE_APP_ID) {
      builder = builder.setAppId(GOOGLE_DRIVE_APP_ID) as typeof builder;
    }

    builder
      .setCallback((data) => {
        if (data.action === window.google!.picker!.Action.CANCEL) {
          resolve([]);
          return;
        }
        if (data.action !== window.google!.picker!.Action.PICKED || !data.docs?.length) {
          resolve([]);
          return;
        }

        resolve(
          data.docs.slice(0, maxFiles).map((doc) => ({
            source: "google-drive" as const,
            name: doc.name,
            fileId: doc.id,
            mimeType: doc.mimeType,
            accessToken,
            bytes: doc.sizeBytes,
          })),
        );
      })
      .build()
      .setVisible(true);
  });
}

export async function pickGoogleDriveFiles(maxFiles: number): Promise<GoogleDriveCloudImport[]> {
  if (maxFiles <= 0) return [];
  await ensureGooglePicker();
  const accessToken = await requestAccessToken();
  return openPicker(accessToken, maxFiles);
}
