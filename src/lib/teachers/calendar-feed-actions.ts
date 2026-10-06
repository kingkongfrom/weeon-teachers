"use server";

import { revalidatePath } from "next/cache";
import { getTeacherSession } from "@/lib/auth/teacher-session";
import {
  calendarFeedUrls,
  ensureCalendarFeedToken,
  rotateCalendarFeedToken,
} from "@/lib/calendar/institution-feed";

export type CalendarFeedLinks = { https: string; webcal: string };

export type CalendarFeedActionResult =
  | { ok: true; links: CalendarFeedLinks }
  | { ok: false; error: "not_authenticated" };

export async function loadCalendarFeedLinks(): Promise<CalendarFeedActionResult> {
  const session = await getTeacherSession();
  if (!session) return { ok: false, error: "not_authenticated" };

  const tokenId = await ensureCalendarFeedToken(session.userId, session.tenantId);
  if (!tokenId) return { ok: false, error: "not_authenticated" };

  return { ok: true, links: calendarFeedUrls(tokenId) };
}

export async function rotateCalendarFeedLinks(): Promise<CalendarFeedActionResult> {
  const session = await getTeacherSession();
  if (!session) return { ok: false, error: "not_authenticated" };

  const tokenId = await rotateCalendarFeedToken(session.userId, session.tenantId);
  if (!tokenId) return { ok: false, error: "not_authenticated" };

  revalidatePath("/agenda/calendario");
  return { ok: true, links: calendarFeedUrls(tokenId) };
}
