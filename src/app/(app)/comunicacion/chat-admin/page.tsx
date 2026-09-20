import { redirect } from "next/navigation";
import { COMMS_CHAT } from "@/lib/comms/paths";

/** Legacy route — admin chat lives in the unified Chat inbox. */
export default function AdminChatRedirectPage() {
  redirect(COMMS_CHAT);
}
