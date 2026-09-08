/** Official MEP Código SABER: six digits, hyphen, two digits. */
const SABER_CODE_RE = /^\d{6}-\d{2}$/;

export function normalizeSaberCode(value: string): string | null {
  const compact = value.trim().replace(/\s+/g, "");
  if (SABER_CODE_RE.test(compact)) return compact;
  const digits = compact.replace(/\D/g, "");
  if (digits.length === 8) {
    const candidate = `${digits.slice(0, 6)}-${digits.slice(6)}`;
    return SABER_CODE_RE.test(candidate) ? candidate : null;
  }
  return null;
}

export function normalizeSchoolKey(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/\.weeon\.school\/?$/, "")
    .replace(/\/+$/, "")
    .replace(/[^a-z0-9-]/g, "");
}

export function normalizeUsername(value: string): string {
  return value.trim().toLowerCase();
}

export function isEmailLogin(value: string): boolean {
  const normalized = normalizeUsername(value);
  return normalized.includes("@") && !normalized.endsWith("@accounts.weeon.school");
}

export function authEmailFor(input: {
  username: string;
  email?: string | null;
  slug?: string | null;
  subdomain?: string | null;
}): string {
  const real = input.email?.trim().toLowerCase();
  if (real && real.includes("@") && !real.endsWith("@accounts.weeon.school")) {
    return real;
  }
  const host = (input.slug || input.subdomain || "colegio")
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "");
  return `${input.username}@${host}.accounts.weeon.school`;
}
