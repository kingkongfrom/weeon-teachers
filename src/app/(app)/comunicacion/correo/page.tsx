import { redirect } from "next/navigation";

/** Legacy route — circulares replaced correo. */
export default async function CorreoRedirectPage({
  searchParams,
}: {
  searchParams: Promise<{ folder?: string }>;
}) {
  const { folder } = await searchParams;
  const query = folder ? `?folder=${encodeURIComponent(folder)}` : "";
  redirect(`/comunicacion/circulares${query}`);
}
