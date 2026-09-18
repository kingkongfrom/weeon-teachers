import { redirect } from "next/navigation";

/** Legacy route — circulares replaced correo. */
export default async function CorreoThreadRedirectPage({
  params,
}: {
  params: Promise<{ threadId: string }>;
}) {
  const { threadId } = await params;
  redirect(`/comunicacion/circulares/${threadId}`);
}
