import type { RichTextDoc } from "@/lib/comms/model";

export type MessageDraftSummary = {
  id: string;
  subject: string;
  preview: string;
  updatedAt: string;
};

export type MessageDraftRecord = {
  id: string;
  subject: string;
  body: RichTextDoc;
  toSelected: unknown[];
  ccSelected: { key: string; name: string }[];
  allowReplies: boolean;
};
