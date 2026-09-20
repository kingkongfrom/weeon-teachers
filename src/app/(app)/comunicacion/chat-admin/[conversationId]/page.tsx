import { redirect } from "next/navigation";
import { COMMS_CHAT } from "@/lib/comms/paths";

/** Legacy route — admin chat threads open in the unified Chat inbox. */
export default async function AdminChatThreadRedirectPage({
  params,
}: {
  params: Promise<{ conversationId: string }>;
}) {
  const { conversationId } = await params;
  redirect(`${COMMS_CHAT}/${conversationId}`);
}
