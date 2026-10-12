export type PresenceStatus = "online" | "away" | "offline" | "unknown";

/** Active in app within this window → green dot. */
export const PRESENCE_ONLINE_MS = 3 * 60 * 1000;
/** Recently seen → amber dot. */
export const PRESENCE_AWAY_MS = 30 * 60 * 1000;

const PROFILE_UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isProfileUuid(value: string): boolean {
  return PROFILE_UUID.test(value.trim());
}

export function presenceStatusFromLastSeen(
  lastSeenAt: string | null | undefined,
  nowMs = Date.now(),
): PresenceStatus {
  if (!lastSeenAt) return "unknown";
  const seen = new Date(lastSeenAt).getTime();
  if (Number.isNaN(seen)) return "unknown";
  const age = nowMs - seen;
  if (age < PRESENCE_ONLINE_MS) return "online";
  if (age < PRESENCE_AWAY_MS) return "away";
  return "offline";
}

export function presenceDotClass(status: PresenceStatus): string {
  switch (status) {
    case "online":
      return "bg-emerald-500";
    case "away":
      return "bg-amber-400";
    case "offline":
      return "bg-foreground/35";
    default:
      return "bg-foreground/20";
  }
}
