import { redirect } from "next/navigation";
import { TEACHER_MESSAGES } from "@/lib/messages/paths";

/** Legacy route — messaging lives under /comunicacion/mensajes. */
export default async function LegacyCircularesPage({
  searchParams,
}: {
  searchParams: Promise<{ folder?: string }>;
}) {
  const { folder } = await searchParams;
  const query = folder ? `?folder=${encodeURIComponent(folder)}` : "";
  redirect(`${TEACHER_MESSAGES}${query}`);
}
