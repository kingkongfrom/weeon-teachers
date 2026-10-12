/** Parse `Name <email>` from compose/history from labels. */
export function parseFromLabel(label: string): { name: string; email: string | null } {
  const trimmed = label.trim();
  const match = trimmed.match(/^(.+?)\s*<([^>]+)>$/);
  if (match) {
    return { name: match[1]?.trim() || trimmed, email: match[2]?.trim() ?? null };
  }
  return { name: trimmed || "—", email: null };
}

export function initialsFromName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0]!.slice(0, 1).toUpperCase();
  return `${parts[0]!.slice(0, 1)}${parts[parts.length - 1]!.slice(0, 1)}`.toUpperCase();
}

export function formatComposeHeaderTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString("es-CR", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function formatComposeLongSent(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const formatted = date.toLocaleString("es-CR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
  return formatted.charAt(0).toUpperCase() + formatted.slice(1);
}

/** Prefix subject for forward (skip if already Re:/Fwd:/Rv:). */
export function ensureForwardSubject(subject: string): string {
  const trimmed = subject.trim();
  if (!trimmed) return "Fwd:";
  if (/^(re|fw|fwd|rv):\s/i.test(trimmed)) return trimmed;
  return `Fwd: ${trimmed}`;
}
