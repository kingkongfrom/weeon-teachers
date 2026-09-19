import { redirect } from "next/navigation";
import { TEACHER_MESSAGES } from "@/lib/messages/paths";

/** Legacy route — messaging lives under /comunicacion/mensajes. */
export default async function LegacyCorreoThreadPage({
  params,
}: {
  params: Promise<{ threadId: string }>;
}) {
  const { threadId } = await params;
  redirect(`${TEACHER_MESSAGES}/${threadId}`);
}
