/** Strip placeholder "Encargado/a" prefixes from guardian display names. */
export function cleanGuardianDisplayName(name: string | null | undefined): string {
  const trimmed = (name ?? "").trim();
  if (!trimmed) return "Encargado";
  const cleaned = trimmed
    .replace(/^Encargado\/a\s*/i, "")
    .replace(/^Encargado\s+/i, "")
    .trim();
  return cleaned || trimmed;
}

/** Second line under a guardian name: "1B · Valentina Acosta". */
export function formatGuardianContextLine(
  classLabel: string | null | undefined,
  studentName: string | null | undefined,
): string {
  const group = classLabel?.trim() ?? "";
  const student = studentName?.trim() ?? "";
  if (group && student) return `${group} · ${student}`;
  return group || student;
}

export function guardianInitial(name: string): string {
  const cleaned = cleanGuardianDisplayName(name);
  return cleaned.slice(0, 1).toUpperCase() || "?";
}
