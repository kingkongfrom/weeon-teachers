import { NextResponse } from "next/server";
import { z } from "zod";
import { getTeacherSession } from "@/lib/auth/teacher-session";
import { downloadCloudImport } from "@/lib/comms/cloud-import/server-download";

const bodySchema = z.object({
  url: z.string().trim().min(1),
  name: z.string().trim().min(1).max(200),
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
    const downloaded = await downloadCloudImport({
      source: "dropbox",
      url: parsed.data.url,
      name: parsed.data.name,
    });

    return new NextResponse(new Uint8Array(downloaded.buffer), {
      status: 200,
      headers: {
        "Content-Type": downloaded.mimeType,
        "Content-Length": String(downloaded.sizeBytes),
        "X-File-Name": encodeURIComponent(downloaded.name),
      },
    });
  } catch (error) {
    const code = error instanceof Error ? error.message : "dropbox_fetch_failed";
    const status =
      code === "invalid_dropbox_url"
        ? 400
        : code === "attachment_type_not_allowed"
          ? 415
          : 502;
    return NextResponse.json({ error: code }, { status });
  }
}
