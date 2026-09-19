import { NextResponse } from "next/server";
import { z } from "zod";
import { getTeacherSession } from "@/lib/auth/teacher-session";
import { downloadCloudImport } from "@/lib/comms/cloud-import/server-download";

const bodySchema = z.object({
  source: z.literal("google-drive"),
  name: z.string().trim().min(1).max(200),
  fileId: z.string().trim().min(1),
  mimeType: z.string().trim().min(1),
  accessToken: z.string().trim().min(1),
  bytes: z.number().int().nonnegative().optional(),
});

export async function POST(request: Request) {
  const session = await getTeacherSession();
  if (!session) {
    return NextResponse.json({ error: "not_authenticated" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }

  try {
    const downloaded = await downloadCloudImport(parsed.data);

    return new NextResponse(new Uint8Array(downloaded.buffer), {
      status: 200,
      headers: {
        "Content-Type": downloaded.mimeType,
        "Content-Length": String(downloaded.sizeBytes),
        "X-File-Name": encodeURIComponent(downloaded.name),
      },
    });
  } catch (error) {
    const code = error instanceof Error ? error.message : "google_drive_fetch_failed";
    const status = code === "attachment_type_not_allowed" ? 415 : 502;
    return NextResponse.json({ error: code }, { status });
  }
}
