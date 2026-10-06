import {
  buildFeedIcsForToken,
  loadActiveFeedToken,
  parseFeedTokenParam,
} from "@/lib/calendar/institution-feed";

export const dynamic = "force-dynamic";

/** Public read-only institution calendar (ICS). Auth is the opaque token in the URL. */
export async function GET(
  _request: Request,
  context: { params: Promise<{ token: string }> },
) {
  const { token: raw } = await context.params;
  const tokenId = parseFeedTokenParam(raw);
  if (!tokenId) {
    return new Response("Not found", { status: 404 });
  }

  const token = await loadActiveFeedToken(tokenId);
  if (!token) {
    return new Response("Not found", { status: 404 });
  }

  const body = await buildFeedIcsForToken(token);
  if (body == null) {
    return new Response("Not found", { status: 404 });
  }

  return new Response(body, {
    status: 200,
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Cache-Control": "private, max-age=300",
      "Content-Disposition": 'inline; filename="weeon-calendario-escolar.ics"',
    },
  });
}
