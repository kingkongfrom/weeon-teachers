/** First letter for chat list / header avatars. */
export function contactInitial(name: string): string {
  const trimmed = name.trim();
  return trimmed.slice(0, 1).toUpperCase() || "?";
}

const CHAT_AVATAR_COLORS = ["#0f766e", "#2563b0", "#7c3aed", "#b45309", "#be185d", "#0e7490"] as const;

/** Stable avatar color so a conversation list is not one repeated green. */
export function contactAvatarColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i += 1) hash = (hash + name.charCodeAt(i)) % CHAT_AVATAR_COLORS.length;
  return CHAT_AVATAR_COLORS[hash] ?? CHAT_AVATAR_COLORS[0];
}
