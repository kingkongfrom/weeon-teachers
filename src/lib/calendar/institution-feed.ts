import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { buildInstitutionCalendarIcs, type IcsEventInput } from "@/lib/calendar/ics";

const FEED_COLUMNS =
  "id, title, event_type, date, end_date, all_day, start_time, end_time, location, description, audience, grade, group_id, lesson_id";

type FeedEventRow = {
  id: string;
  title: string;
  event_type: string;
  date: string;
  end_date: string | null;
  all_day: boolean;
  start_time: string | null;
  end_time: string | null;
  location: string | null;
  description: string | null;
  audience: string;
  grade: string | null;
  group_id: string | null;
  lesson_id: string | null;
};

export type CalendarFeedTokenRow = {
  id: string;
  tenant_id: string;
  profile_id: string;
  revoked_at: string | null;
};

export function parseFeedTokenParam(raw: string): string | null {
  const trimmed = raw.trim();
  const withoutExt = trimmed.replace(/\.ics$/i, "");
  const uuidRe =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRe.test(withoutExt) ? withoutExt : null;
}

export async function loadActiveFeedToken(tokenId: string): Promise<CalendarFeedTokenRow | null> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("calendar_feed_tokens")
    .select("id, tenant_id, profile_id, revoked_at")
    .eq("id", tokenId)
    .maybeSingle();
  if (error || !data || data.revoked_at) return null;
  return data as CalendarFeedTokenRow;
}

async function loadProfileRole(profileId: string): Promise<"admin" | "teacher" | null> {
  const admin = createAdminClient();
  const { data } = await admin.from("profiles").select("role").eq("id", profileId).maybeSingle();
  if (data?.role === "admin" || data?.role === "teacher") return data.role;
  return null;
}

async function loadTeacherClassIds(profileId: string): Promise<string[]> {
  const admin = createAdminClient();
  const { data: teachers } = await admin
    .from("teachers")
    .select("id")
    .eq("profile_id", profileId)
    .is("deleted_at", null);
  const teacherIds = (teachers ?? []).map((row) => row.id);
  if (teacherIds.length === 0) return [];

  const { data: lessons } = await admin
    .from("class_lessons")
    .select("class_id")
    .in("teacher_id", teacherIds);
  return [...new Set((lessons ?? []).map((row) => row.class_id))];
}

async function loadGradesForClasses(classIds: string[]): Promise<Set<string>> {
  if (classIds.length === 0) return new Set();
  const admin = createAdminClient();
  const { data } = await admin.from("classes").select("grade").in("id", classIds);
  return new Set((data ?? []).map((row) => row.grade).filter((g): g is string => !!g));
}

function isInstitutionFeedRow(row: FeedEventRow): boolean {
  return row.lesson_id == null && row.event_type !== "exam";
}

function rowVisibleToMember(
  row: FeedEventRow,
  role: "admin" | "teacher",
  classIds: string[],
  grades: Set<string>,
): boolean {
  if (!isInstitutionFeedRow(row)) return false;
  if (role === "admin") return true;
  if (row.audience === "school" || row.audience === "teachers") return true;
  if (row.audience === "grade" && row.grade && grades.has(row.grade)) return true;
  if (row.audience === "group" && row.group_id && classIds.includes(row.group_id)) return true;
  return false;
}

function feedWindow(): { start: string; end: string } {
  const today = new Date();
  const start = new Date(today);
  start.setMonth(start.getMonth() - 3);
  const end = new Date(today);
  end.setFullYear(end.getFullYear() + 2);
  const iso = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  return { start: iso(start), end: iso(end) };
}

export async function buildFeedIcsForToken(token: CalendarFeedTokenRow): Promise<string | null> {
  const role = await loadProfileRole(token.profile_id);
  if (!role) return null;

  const classIds = role === "teacher" ? await loadTeacherClassIds(token.profile_id) : [];
  const grades = role === "teacher" ? await loadGradesForClasses(classIds) : new Set<string>();

  const { start, end } = feedWindow();
  const admin = createAdminClient();
  const { data: tenant } = await admin.from("tenants").select("name").eq("id", token.tenant_id).maybeSingle();
  const calName = tenant?.name?.trim()
    ? `${tenant.name.trim()} — Calendario escolar`
    : "Weeon — Calendario escolar";

  const { data, error } = await admin
    .from("calendar_events")
    .select(FEED_COLUMNS)
    .eq("tenant_id", token.tenant_id)
    .gte("date", start)
    .lte("date", end)
    .order("date", { ascending: true })
    .order("start_time", { ascending: true, nullsFirst: true });

  if (error || !data) return null;

  const visible = (data as FeedEventRow[]).filter((row) =>
    rowVisibleToMember(row, role, classIds, grades),
  );

  const events: IcsEventInput[] = visible.map((row) => ({
    uid: `weeon-${token.tenant_id}-${row.id}@weeon.school`,
    title: row.title,
    description: row.description,
    location: row.location,
    date: row.date,
    endDate: row.end_date,
    allDay: row.all_day,
    startTime: row.start_time,
    endTime: row.end_time,
  }));

  return buildInstitutionCalendarIcs({ calName, events });
}

export async function ensureCalendarFeedToken(
  profileId: string,
  tenantId: string,
): Promise<string | null> {
  const admin = createAdminClient();
  const { data: existing } = await admin
    .from("calendar_feed_tokens")
    .select("id")
    .eq("profile_id", profileId)
    .is("revoked_at", null)
    .maybeSingle();
  if (existing?.id) return existing.id as string;

  const { data: created, error } = await admin
    .from("calendar_feed_tokens")
    .insert({ tenant_id: tenantId, profile_id: profileId })
    .select("id")
    .single();
  if (error || !created) return null;
  return created.id as string;
}

export async function rotateCalendarFeedToken(
  profileId: string,
  tenantId: string,
): Promise<string | null> {
  const admin = createAdminClient();
  const now = new Date().toISOString();
  await admin
    .from("calendar_feed_tokens")
    .update({ revoked_at: now })
    .eq("profile_id", profileId)
    .is("revoked_at", null);

  const { data: created, error } = await admin
    .from("calendar_feed_tokens")
    .insert({ tenant_id: tenantId, profile_id: profileId })
    .select("id")
    .single();
  if (error || !created) return null;
  return created.id as string;
}

export function teachersPublicOrigin(): string {
  const fromEnv = process.env.WEEON_TEACHERS_ORIGIN?.trim();
  if (fromEnv) return fromEnv.replace(/\/$/, "");
  const vercel = process.env.VERCEL_URL?.trim();
  if (vercel) return `https://${vercel.replace(/\/$/, "")}`;
  return "http://localhost:3000";
}

export function calendarFeedUrls(tokenId: string): { https: string; webcal: string } {
  const origin = teachersPublicOrigin();
  const https = `${origin}/api/calendar/feed/${tokenId}.ics`;
  const webcal = https.replace(/^https:\/\//i, "webcal://");
  return { https, webcal };
}
